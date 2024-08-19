import Link from "next/link";
import {
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle
} from "flowbite-react";
import { Logo } from "./logo";

export function NavServer({ loggedIn = false }) {
  return (
    <Navbar fluid rounded>
      <NavbarBrand as={Link} href="https://moji.blue">
        <Logo />
      </NavbarBrand>
      <NavbarToggle />
      <NavbarCollapse>
        <NavbarLink href="/">About</NavbarLink>
        {loggedIn ? (
          <>
            <NavbarLink href="#">Collection</NavbarLink>
            <NavbarLink href="#">Explore</NavbarLink>
          </>
        ) : (
          <>
            <NavbarLink href="/login">Login</NavbarLink>
          </>
        )}
      </NavbarCollapse>
    </Navbar>
  );
}
