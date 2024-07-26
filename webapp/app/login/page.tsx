"use client";

import { useCallback, useEffect, useState } from "react";
import { BskyAgent } from "@atproto/api";

interface CredState {
  handle: string | null;
  password: string | null;
  jwt?: string;
  refreshToken?: string;
  service: string;
}

export default function Page() {
  const [creds, setCreds] = useState<CredState>({
    handle: null,
    password: null,
    service: "https://bsky.social"
  });

  const onSubmit = useCallback(() => {
    if (!creds.handle || !creds.password) return;
    const agent = new BskyAgent({ service: "https://bsky.social" });
    agent
      .login({ identifier: creds.handle, password: creds.password })
      .then((session) => {
        sessionStorage.setItem("jwt", session.data.accessJwt);
        sessionStorage.setItem("refreshToken", session.data.refreshJwt);
      });
  }, [creds]);

  return (
    <>
      <label className="flex items-center text-3xl">
        Handle{" "}
        <input
          type="text"
          onChange={(e) => setCreds({ ...creds, handle: e.target.value })}
          placeholder="@bluemoji.bsky.social"
          required
          style={{ color: "black" }}
        />
      </label>
      <label className="flex items-center text-3xl">
        App Password{" "}
        <input
          type="password"
          onChange={(e) => setCreds({ ...creds, password: e.target.value })}
          name="password"
          placeholder="Password"
          required
          style={{ color: "black" }}
        />
      </label>
      <label className="flex items-center text-3xl">
        Service{" "}
        <input
          type="text"
          onChange={(e) => setCreds({ ...creds, service: e.target.value })}
          defaultValue="https://bsky.social"
          required
          style={{ color: "black" }}
        />
      </label>
      <button type="submit" onClick={onSubmit}>
        Login
      </button>
    </>
  );
}
