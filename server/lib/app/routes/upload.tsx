import React from "react";
import { MsgBox } from "../ncurses/MsgBox";

export const Upload = () => {
  return (
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
  );
};
