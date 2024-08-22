import React from "react";
import { Routes, Route, Outlet, Link } from "react-router-dom";
import { Main } from "./routes/main";
import { BrowsePacks } from "./routes/browse-packs";
import { Upload } from "./routes/upload";
import { Workshop } from "./routes/workshop";
import { MakePack } from "./routes/make-pack";

const Layout = () => {
  return (
    <div className="container">
      <header className="backtitle">
        <h3>
          <u>Bluemoji</u>: custom emoji on AT proto
        </h3>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <strong>bluemoji</strong> by{" "}
        <a href="https://bsky.app/profile/aendra.com">@aendra.com</a>
        <br />
        <a href="https://github.com/poerror/ncurses-css">
          ncurses theme
        </a> |{" "}
        <a href="https://github.com/dtinth/comic-mono-font">comic mono font</a>
      </footer>
    </div>
  );
};

export const App = () => (
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Main />} />
      <Route path="browse-packs" element={<BrowsePacks />} />
      <Route path="make-pack" element={<MakePack />} />
      <Route path="workshop" element={<Workshop />} />
      <Route path="upload" element={<Upload />} />
    </Route>
  </Routes>
);
