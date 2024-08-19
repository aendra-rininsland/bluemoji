"use client";

import Link from "next/link";
import { Navbar } from "flowbite-react";
import { Logo } from "./logo";

export function Nav({ loggedIn }: { loggedIn: boolean }) {
  return (
    <Navbar fluid rounded>
      <Navbar.Brand as={Link} href="https://flowbite-react.com">
        <Logo />
      </Navbar.Brand>
      <Navbar.Toggle />
      <Navbar.Collapse>
        <Navbar.Link href="/" active>
          About
        </Navbar.Link>
        {loggedIn ? (
          <>
            <Navbar.Link href="#">Collection</Navbar.Link>
            <Navbar.Link href="#">Explore</Navbar.Link>
          </>
        ) : (
          <>
            <Navbar.Link href="/login">Login</Navbar.Link>
          </>
        )}
      </Navbar.Collapse>
    </Navbar>
  );
}
