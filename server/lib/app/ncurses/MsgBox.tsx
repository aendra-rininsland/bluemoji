import React, { MouseEventHandler } from "react";

export const MsgBox = ({
  title = "msgbox",
  children = <div>Hello world!</div>,
  onAccept
}: {
  title: string;
  children: React.JSX.Element;
  onAccept?: MouseEventHandler;
}) => (
  <div className="box">
    <div className="content">
      <span className="title">{title}</span>
      {children}
      {onAccept && (
        <div className="buttons">
          <a href="#" onClick={onAccept} className="btn active">
            OK
          </a>
        </div>
      )}
    </div>
  </div>
);
