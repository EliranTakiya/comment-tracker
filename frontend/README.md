# Comment Tracker Frontend

The frontend uses React, Vite, and Vitest. Run commands from this directory:

```sh
npm install
npm start
npm test
npm run build
```

The development server runs at `http://localhost:3000` and proxies `/api` to `http://localhost:5000` by default. Set `COMMENT_TRACKER_API_PROXY` to use a different backend URL.

Production assets are written to `build/` for the existing Render static-site configuration.