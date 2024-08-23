import React, { ChangeEventHandler, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ButtonGroup, InputBox, InputGroup } from "../ncurses/InputBox";

export const Login = () => {
  const navigate = useNavigate();
  const [handle, setHandle] = useState<string | null>(null);

  const onAccept = useCallback(() => {
    console.log(`/redirect-oauth?handle=${handle}`);
    window.location.href = `/redirect-oauth?handle=${handle}`;
  }, [handle]);

  const onCancel = useCallback(() => {
    navigate(-1);
  }, []);

  const onChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      setHandle(event.target.value);
    },
    [setHandle]
  );

  return (
    <InputBox title="Login via OAuth" style={{ width: "70%" }}>
      <InputGroup onChange={onChange} id="name" label="Handle" />
      <ButtonGroup onAccept={onAccept} onCancel={onCancel} />
    </InputBox>
  );
};
