import cv2, numpy as np
from skimage.metrics import structural_similarity as ssim
from concurrent.futures import ThreadPoolExecutor

# ---------------- FFT candidates (multi-band + optional jitter) ----------------
def __fft_band_shift__(a, b):
    (dx, _), _ = cv2.phaseCorrelate(a, b)
    return dx

def __fft_shift_candidates(img1, img2, bands=3, extra_jitter=2, band_min_h=64):
    g1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY).astype(np.float32)
    h, w = g1.shape

    # choose band windows
    band_h = max(band_min_h, h // (bands + 1))
    ys = []
    for i in range(bands):
        y0 = (i + 1) * h // (bands + 1) - band_h // 2
        ys.append((max(0, y0), min(h, y0 + band_h)))
    rng = np.random.default_rng(42)
    for _ in range(extra_jitter):
        y0 = int(rng.integers(0, max(1, h - band_h)))
        ys.append((y0, y0 + band_h))

    # Hanning window reduces edge artifacts
    seeds = []
    win_row = np.hanning(band_h).astype(np.float32)
    win_col = np.hanning(w).astype(np.float32)
    for (y0, y1) in ys:
        a = g1[y0:y1, :]
        b = g2[y0:y1, :]
        # adapt window to actual band height
        wr = np.hanning(a.shape[0]).astype(np.float32)[:, None]
        wc = win_col[None, :]
        win = wr * wc
        dx = __fft_band_shift__(a * win, b * win)
        seeds.append(int(np.round(dx)) % w)

    # dedup seeds on the circle
    seeds = sorted(set(seeds))
    return seeds, w

# ---------------- SSIM objective with memoization ----------------
class SSIMObjective:
    def __init__(self, img1, img2):
        self.H, self.W = img1.shape[:2]
        self.g2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        self.doubled_gray = np.hstack([cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY),
                                       cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)])
        self.cache = {}

    def score(self, dx):
        dx = int(dx) % self.W
        if dx in self.cache:
            return self.cache[dx]
        crop = self.doubled_gray[:, dx:dx + self.W]
        val = ssim(self.g2, crop)
        self.cache[dx] = val
        return val

# ---------------- 1-D hill-climb with step halving ----------------
def __hill_climb_ssim(obj: SSIMObjective, start, init_step=256, min_step=2, patience=2):
    W = obj.W
    x = int(start) % W
    step = int(max(1, init_step))
    best = obj.score(x)
    no_improve = 0

    while step >= min_step:
        # probe left/right
        xl = (x - step) % W
        xr = (x + step) % W
        sl = obj.score(xl)
        sr = obj.score(xr)

        # move if any side improves
        if sl > best or sr > best:
            if sl >= sr:
                x, best = xl, sl
            else:
                x, best = xr, sr
            no_improve = 0
        else:
            # no improvement at this scale -> shrink step
            step = step // 2
            no_improve += 1
            if no_improve >= patience and step >= min_step:
                # small nudge to escape flat plateau before shrinking again
                x = (x + step) % W
                best = obj.score(x)

    return x, best

# ---------------- Final micro-refine + optional subpixel (quadratic fit) ----------------
def __micro_refine(obj: SSIMObjective, center, span=12):
    W = obj.W
    xs = [(center + d) % W for d in range(-span, span + 1)]
    vals = np.array([obj.score(x) for x in xs], dtype=np.float64)
    best_idx = int(vals.argmax())
    best_x = xs[best_idx]

    # Quadratic fit around the peak for subpixel dx (optional)
    if 0 < best_idx < len(xs) - 1:
        x0, x1, x2 = best_idx - 1, best_idx, best_idx + 1
        y0, y1, y2 = vals[x0], vals[x1], vals[x2]
        denom = (y0 - 2 * y1 + y2)
        if abs(denom) > 1e-12:
            offset = 0.5 * (y0 - y2) / denom  # in [-1,1]
            subpixel = (best_x + offset) % W
            return subpixel, vals[best_idx]
    return float(best_x), vals[best_idx]

# ---------------- Multi-start (FFT seeds) in parallel ----------------
def best_yaw_shift_hillclimb(ref_img, input_img,
                             init_step=256, min_step=2,
                             bands=3, extra_jitter=2,
                             micro_span=12, n_jobs=8,
                             target_h=None):
    """
    Estimate yaw shift between two panoramas using FFT seeds + SSIM hill-climb.

    Args:
        ref_img, input_img: input BGR images, same size (H,W).
        target_h: if set, downsample both to this height for processing,
                  then remap shift back to original width.

    Returns:
        aligned (original-res BGR), best_x (float shift in px at original W),
        best_s (SSIM score), meta (dict with seeds, evaluations, downsample info).
    """
    H_orig, W_orig = input_img.shape[:2]

    # --- Downsample if requested ---
    if target_h is not None and target_h < H_orig:
        scale = target_h / float(H_orig)
        new_w = int(round(W_orig * scale))
        img1_small = cv2.resize(input_img, (new_w, target_h), interpolation=cv2.INTER_AREA)
        img2_small = cv2.resize(ref_img, (new_w, target_h), interpolation=cv2.INTER_AREA)
        H_proc, W_proc = img1_small.shape[:2]
        print(f'Downsampled to {H_proc}x{W_proc} for processing (scale={scale:.3f})')
    else:
        img1_small, img2_small = input_img, ref_img
        H_proc, W_proc = H_orig, W_orig
        scale = 1.0

    # --- FFT seeds ---
    seeds, _ = __fft_shift_candidates(img1_small, img2_small,
                                    bands=bands, extra_jitter=extra_jitter)
    print(f'Found {len(seeds)} FFT seeds at {W_proc}px width, starting hill-climb SSIM...')

    obj = SSIMObjective(img1_small, img2_small)

    def solve_from(seed):
        x, s = __hill_climb_ssim(obj, start=seed,
                               init_step=init_step, min_step=min_step)
        x_ref, s_ref = __micro_refine(obj, x, span=micro_span)
        return x_ref, s_ref

    # Run seeds in parallel
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=n_jobs) as ex:
        results = list(ex.map(solve_from, seeds if seeds else [0]))

    best_x_small, best_s = max(results, key=lambda t: t[1])

    # --- Scale shift back to original width ---
    best_x_orig = (best_x_small / W_proc) * W_orig

    # --- Crop aligned original-res color ---
    doubled_color = np.hstack([input_img, input_img])
    best_int = int(np.floor(best_x_orig)) % W_orig
    aligned = doubled_color[:, best_int:best_int + W_orig]

    meta = {
        "seeds": seeds,
        "evaluations": len(obj.cache),
        "proc_size": (H_proc, W_proc),
        "orig_size": (H_orig, W_orig),
        "scale": scale,
    }

    return aligned, best_x_orig, best_s, meta
  
  

if __name__ == "__main__":
    import sys
    import time
    
    if len(sys.argv) < 4:
        print("Usage: python alignment.py ref.jpg input.jpg output.jpg [target_h]")
        sys.exit(1)
    
    ref_path = sys.argv[1]
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    target_h = int(sys.argv[4]) if len(sys.argv) >= 5 else None
    print(f"Loading images '{ref_path}' and '{input_path}'...")
    ref_img = cv2.imread(ref_path)
    input_img = cv2.imread(input_path)
    if ref_img is None or input_img is None:
        print("Failed to load images.")
        sys.exit(1)
    if ref_img.shape != input_img.shape:
        print("Images must be the same size.")
        sys.exit(1)
        
    print("Aligning...")
    start_time = time.time()
    aligned, best_x, best_s, meta = best_yaw_shift_hillclimb(
        ref_img, input_img, target_h=target_h, n_jobs=4
    )
    elapsed = time.time() - start_time
    print(f"Done in {elapsed:.2f}s, best_x={best_x:.2f}px, best_s={best_s:.5f}, meta={meta}")
    cv2.imwrite(output_path, aligned)
    print(f"Saved aligned image to '{output_path}'")