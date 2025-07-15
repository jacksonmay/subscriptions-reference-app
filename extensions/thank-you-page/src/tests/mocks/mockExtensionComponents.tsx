import type {PropsWithChildren} from 'react';

/**
 * This file contains mocks for Checkout UI extension components.
 * Since Checkout UI extensions run in a remote-ui environement with no DOM, the extension components
 * do not work with React Testing Library. Instead of setting up another testing framework, these mocks
 * allow us to test our extension with the existing testing framework.
 * IMPORTANT: MAKE SURE TO IMPORT THIS BEFORE ANY COMPONENTS IN TEST FILES OR IT WILL NOT GET CALLED
 */

export function BlockStack({children}: PropsWithChildren) {
  return <div className="BlockStack">{children}</div>;
}

export function Banner({children}: PropsWithChildren) {
  return <div className="Banner">{children}</div>;
}

export function Button({children}: PropsWithChildren) {
  return <button className="Button">{children}</button>;
}

export function Text({children}: PropsWithChildren) {
  return <span className="Text">{children}</span>;
}

export function Heading({children}: PropsWithChildren) {
  return <h2 className="Heading">{children}</h2>;
}

export function View({children}: PropsWithChildren) {
  return <div className="View">{children}</div>;
}
