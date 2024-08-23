import React, { useEffect, useState, useCallback } from "react";
// import { MsgBox } from "../ncurses/MsgBox";

import { ContentBox } from "../ncurses/ContentBox";
import { useDropzone } from "react-dropzone";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ButtonGroup, InputBox, InputGroup } from "../ncurses/InputBox";

export const Upload = () => {
  const [lottie, setLottie] = useState<ArrayBuffer | null>(null);
  const onDrop = useCallback(async (files: File[]) => {
    const [file] = files;
    setLottie(await file.arrayBuffer());
  }, []);
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({
      onDrop,
      accept: {
        "application/json": [".json"],
        "application/lottie+zip": [".lottie"],
        "image/png": [".png", ".apng"]
      },
      minSize: 1,
      maxSize: 65536,
      maxFiles: 2
    });

  const acceptedFileItems = acceptedFiles.map((file) => (
    <li key={file.path}>
      {file.path} - {file.size} bytes
    </li>
  ));

  const onAccept = useCallback(() => {}, []);
  const onCancel = useCallback(() => {}, []);

  useEffect(() => {}, []);

  const asset = lottie;
  return (
    <>
      {isDragActive && <div className="on-drag">drag n drop to add a file</div>}
      <div {...getRootProps()} style={{ minWidth: "30%" }}>
        <ContentBox title="Upload Bluemoji" style={{ padding: "3em" }}>
          <div
            className="well file-picker"
            style={{ padding: asset ? "1em" : "3em" }}
          >
            <input {...getInputProps()} />
            {lottie && <DotLottieReact loop autoplay data={lottie} />}
          </div>
          {!acceptedFiles.length && (
            <div style={{ textAlign: "center", padding: "2em" }}>
              <em>Click to open file picker dialog</em>
            </div>
          )}
        </ContentBox>
      </div>
      {asset && (
        <div style={{ marginTop: "2em" }}>
          <InputBox title="Metadata" style={{ width: "70%" }}>
            <InputGroup id="name" label="Emoji name" />
            <InputGroup id="alt" label="alt text" />
            <ButtonGroup onAccept={onAccept} onCancel={onCancel} />
          </InputBox>
        </div>
      )}
    </>
  );
};
