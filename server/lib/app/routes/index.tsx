import React from "react";
import { MenuBox } from "../ncurses/MenuBox";
import { MsgBox } from "../ncurses/MsgBox";
import { useNavigate } from "react-router-dom";

export const Main = () => {
  const navigate = useNavigate();
  const loggedIn = document.cookie.match("did=");
  return (
    <>
      <MsgBox title="Welcome!">
        <div style={{ textAlign: "center" }}>
          <p>
            Welcome to{" "}
            <strong>
              <u>moji.blue</u>
            </strong>
            !{" "}
          </p>
          <p>This site is designed to help you upload and manage Bluemoji.</p>
        </div>
      </MsgBox>
      <MenuBox
        keyboardFocus={true}
        title="Main Menu"
        onAccept={(e) => {
          switch (e.value) {
            case "bluesky": {
              window.location.href = "https://bsky.app/profile/moji.blue";
              break;
            }
            case "github": {
              window.location.href =
                "https://github.com/aendra-rininsland/bluemoji";
              break;
            }
            default: {
              return navigate(`/${e.value}`);
            }
          }
        }}
        onCancel={() => {
          navigate(`/`);
        }}
        options={[
          ...(loggedIn
            ? [
                { label: "Upload new Bluemoji", value: "upload" },
                { label: "View Bluemoji collection", value: "collection" },
                { label: "Create Bluemoji Pack", value: "make-pack" }
              ]
            : [{ label: "Login", value: "login" }]),
          { label: "Browse Bluemoji Packs", value: "browse-packs" },
          { label: "Bluemoji Workshop", value: "workshop" },
          { label: "On Bluesky: @moji.blue", value: "bsky" },
          { label: "On GitHub: @aendra-rininsland/bluemoji", value: "github" }
        ]}
      />
    </>
  );
};
