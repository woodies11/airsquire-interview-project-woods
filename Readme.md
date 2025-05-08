# Airsquire fullstack engineer interview project

|                      |                           |
| -------------------- | ------------------------- |
| **Fork's Author**:   | Romson (Woods) Preechawit |
| Last Readme Updated: | 2025-05-08                |

## Submission

This is version 0.0.1 of my interview project.

The project is a minimal monorepo, utilizing [PNPM](https://pnpm.io/) as the project management tools.

### Key Technology:

- PNPM
- TypeScript and ESM
- NodeJS + Express Backend
- NextJS (App-Router) Frontend
- MongoDB Database
- Three.js
- TailwindCSS
- Ant Design
- OpenAI Chat Completion API

### Key Functionality:

- Upload/Download images with metadata
- View images in panoramic viewer along with metadata
- Bookmark/unbookmark images
- Search by name (case-insensitive and semi-fuzzy)
- Filter by bookmark/unbookmark
- A pie-chart showing bookmark vs unbookmark statistic
- **Background Uploading** for very large images (require tab to remain open but can navigate around the app)
- **LLMs-powered Image Metadata Enrichment** through Stream API - for more fluid UX
- Vector-database Ready (LLMs generated metadata is stored as a seperate metadata field, ready to be embedded/vectorized) for more powerful, natural langauge search in the future
- Mostly **Server-Side-Rendering (SSR)** for more responsive experience
- Responsive UI

The project is structured as a monorepo with separate packages for:

- `apps/web`: Next.js frontend
- `apps/api`: Express backend
- `packages/*`: Shared code between frontend and backend (currently only share a type, but could move things such as hash computation here—though, keep in mind that polyfills might be needed)

### Some Technological Choice Explaination

- Ant Design was used **ONLY** on the `/upload` page, while the rest of the app mainly rely on TailwindCSS - Ant Design itself is very heavy (huge bundle size), slow, and do not play well with SSR (thus, the upload page may feel more sluggish than other pages, especially on slower connection)
  1. Personally, I am fluent in HTML/CSS enough that it's usually faster for me to code a component myself with tailwind or pure HTML + CSS than to find and use one from a library, unless the component is logic heavy (e.g. DatePicker)
  2. I also have more fine-grain control with fully custom components; especially in performance optimization
- GraphQL was NOT considered because this project only have one, very flat (not heavily nested), data type. GraphQL only make sense if the data is much more complex or require pulling/joining data from multiple sources/tables. That is not the case here.
- Redux was also NOT used because
  1. Redux is, again, boilerplat heavy and usually encourage global state, which, unless an app is truely complex enough and require enough global level state interaction, then Redux should not be used.
  2. Redux generally go against SSR/NextJS/Modern React Principle (keep state in query params or scope it narrowly)
  3. In most cases, a locally, well scoped `ContextAPI` is much easier to manage and usually will perform better
- While Express were used as the backend here, it is actually not needed as NextJS itself already spin up its own NodeJS server and support API routes/backend integration. However, it also has a high learning curve so unless the whole team is very comfortable with NextJS's server components, a standalone NodeJS server could still be a valid choice, and may also scale better/easier.
- OpenAI integration - because LLMs is the future! This technology help improve UX (auto tagging, name suggestion, etc.) and, in the future, could allow for much more context rich searching and filtering.

### Known Limitations / Future Improvements

- Currently no authentication; all features are open-access
- Metadata enrichment may be slow if OpenAI API rate limits
- Vector DB integration is not implemented yet, but architecture is ready for it
- No pagination or infinite scroll in gallery (yet)
- Minimal Typing and Type Guarding - in real production app, would use Zod to validate JSON more aggresively and utilize Type Guard and TypeScript's type discremination more, but since this only have one major type, that was not strictly done.
- Currently, there is no script or jobs to prune and clean up temp files and 'orphan' entries from the DB/Backend but that should be an easy `cron` job to implement, depending on where we deploy.

## Running the Project

### Requirement

- [Node.JS](https://nodejs.org/) or [nvm](https://github.com/nvm-sh/nvm) (Recommended) - 18.18.0 was used during development
- [PNPM](https://pnpm.io/installation) installed
- [Docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/install/) - IF you want to use the pre-configured MongoDB locally; otherwise, feel free to skip and provide your own MongoDB connection string in `.env` file (more later)
- [OpenAI](https://openai.com/) account and API key

### Setting up and Running Local Development

1. First, make sure to create and populate each `.env` files in both `./apps/api` and `./apps/web` (see `.env.example` in each directory for what you need)
2. If you are using the provided `docker-compose.yaml` for MongoDB then your connection string should be
   `mongodb://root:<PASSWORD_IN_COMPOSE_FILE>@localhost:27017`
3. You can generate an OpenAI API key from [OpenAI Platform Page](https://platform.openai.com/settings/) > Settings > API keys - this is needed for LLMs enrichment functionality
4. `NEXT_PUBLIC_BASE_API_URL` can be the same as in the example file if running locally, otherwise, put the base URL for your express server instance here
5. `cd` to the project's root directory and run `pnmp i`
6. Finally, run `pnpm run dev` to start all the development servers/components
7. Visit [http://localhost:3000](http://localhost:3000) to start using the app

---

## Goal

Create a web application to

1. Upload & Download panorama images
2. List panorama images in a table with the related meta-data about the image files
3. Search panorama images by name
4. Bookmark panorama images
5. Can filter panorama images by the status of bookmark in the list
6. Show data analytics by charts about the bookmarked/un-bookmarked images
7. Panorama viewer like this [example](https://threejs.org/examples/webgl_panorama_equirectangular.html)

## Process

Please create your own fork and manage on your side.
Need to show and introduce the project demo in the second round interview.

## Recommended but not limited tech stack

- ReactJS
- ExpressJS
- NodeJS
- MongoDB
- ThreeJS
- Ant Design

## Bonus

### Prefered lib and languages

- React hooks
- Typescript

### General

- Package Management
- Nice UI/UX

### Advanced

- Responsive UI
- GraphQL
- Redux
- Unit Test
- Activities logging in backend
- Docker
- Frontend served on cloud (AWS/Google/Azure/AliCloud/....)

## Tips

- You can use this [boilerplate](https://github.com/AirGo3D/frontend-boilerplate) to bootstrap front-end project, or any other ReactJS boilerplate you prefer.
- You can use this [boilerplate](https://github.com/AirGo3D/nodejs-boilerplate) to bootstrap back-end project, or any other ExpressJS boilerplate you prefer.
- You can find panorama images from this repo
