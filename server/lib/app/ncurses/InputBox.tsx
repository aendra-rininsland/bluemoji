import React from "react";

export const InputGroup = ({
  label = "Enter some text",
  key = "someinput"
}) => (
  <div className="input-group">
    <label htmlFor={key}>{label}</label>
    <input type="text" className="" id={key} />
  </div>
);

export const ButtonGroup = ({ onAccept, onCancel }) => (
  <div className="buttons">
    {onAccept && (
      <a href="#" onClick={onAccept} className="btn active">
        OK
      </a>
    )}
    {onCancel && (
      <a href="#" onClick={onCancel} className="btn">
        Cancel
      </a>
    )}
  </div>
);

export const InputBox = ({ title = "inputbox" }) => (
  <div className="box" style={{ marginTop: "50px" }}>
    <div className="content">
      <span className="title">{title}</span>
    </div>
  </div>
);
