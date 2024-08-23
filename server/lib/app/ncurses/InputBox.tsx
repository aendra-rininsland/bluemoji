import React, { CSSProperties, ReactNode, ChangeEventHandler } from "react";

export const InputGroup = ({
  label = "Enter some text",
  id = "someinput",
  onChange
}: {
  label: string;
  id: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) => (
  <div className="input-group">
    <label htmlFor={id}>{label}</label>
    <input onChange={onChange} type="text" id={id} />
  </div>
);

export const ButtonGroup = ({
  onAccept,
  onCancel
}: {
  onCancel: () => void;
  onAccept: () => void;
}) => (
  <div className="buttons">
    {onAccept && (
      <a href="#" onClick={() => onAccept()} className="btn active">
        OK
      </a>
    )}
    {onCancel && (
      <a href="#" onClick={() => onCancel()} className="btn">
        Cancel
      </a>
    )}
  </div>
);

export const InputBox = ({
  title = "inputbox",
  children,
  style = {}
}: {
  title: string;
  children: ReactNode;
  style: CSSProperties;
}) => {
  return (
    <div className="box" style={style}>
      <div className="content">
        <span className="title">{title}</span>
        {children}
      </div>
    </div>
  );
};
