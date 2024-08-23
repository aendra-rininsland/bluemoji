import React, { CSSProperties, ReactNode } from "react";

export const ContentBox = ({
  title,
  children,
  style = {}
}: {
  title: string;
  children: ReactNode;
  style: CSSProperties;
}) => (
  <div className="box">
    <div className="content" style={style}>
      <span className="title">{title}</span>
      {children}
    </div>
  </div>
);
