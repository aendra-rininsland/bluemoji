import React from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import { Main } from "./routes";
import { BrowsePacks } from "./routes/browse-packs";
import { Upload } from "./routes/upload";
import { Workshop } from "./routes/workshop";
import { MakePack } from "./routes/make-pack";
import { Login } from "./routes/login";
import { Collection } from "./routes/collection";

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

export const App = () => {
  const {
    groups: { did }
  } = document?.cookie?.match(/did=(?<did>[^;]+)/) ?? { groups: { did: null } };

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Main />} />
        <Route path="collection" element={<Collection did={did} />} />
        <Route path="browse-packs" element={<BrowsePacks />} />
        <Route path="make-pack" element={<MakePack />} />
        <Route path="workshop" element={<Workshop />} />
        <Route path="upload" element={<Upload />} />,
        <Route path="login" element={<Login />} />
      </Route>
    </Routes>
  );
};
