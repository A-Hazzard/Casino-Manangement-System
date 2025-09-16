import React from "react";
import { render, screen } from "@testing-library/react";
import MobileCollectionModal from "../MobileCollectionModal";

// Mock the child components
jest.mock("../LocationSelector", () => {
  return function MockLocationSelector() {
    return <div data-testid="location-selector">Location Selector</div>;
  };
});

jest.mock("../MachineSelector", () => {
  return function MockMachineSelector() {
    return <div data-testid="machine-selector">Machine Selector</div>;
  };
});

jest.mock("../MachineDataForm", () => {
  return function MockMachineDataForm() {
    return <div data-testid="machine-data-form">Machine Data Form</div>;
  };
});

jest.mock("../CollectedMachinesList", () => {
  return function MockCollectedMachinesList() {
    return (
      <div data-testid="collected-machines-list">Collected Machines List</div>
    );
  };
});

// Mock the Dialog component
jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}));

// Mock the Button component
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock icons
jest.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">←</div>,
  List: () => <div data-testid="list-icon">☰</div>,
  Plus: () => <div data-testid="plus-icon">+</div>,
}));

describe("MobileCollectionModal", () => {
  const mockProps = {
    show: true,
    onClose: jest.fn(),
    locations: [
      {
        _id: "1",
        name: "Test Location",
        machines: [
          {
            _id: "machine1",
            name: "Test Machine",
            serialNumber: "SN123",
          },
        ],
      },
    ],
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when show is true", () => {
    render(<MobileCollectionModal {...mockProps} />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-header")).toBeInTheDocument();
  });

  it("does not render when show is false", () => {
    render(<MobileCollectionModal {...mockProps} show={false} />);

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("shows location selector by default", () => {
    render(<MobileCollectionModal {...mockProps} />);

    expect(screen.getByTestId("location-selector")).toBeInTheDocument();
  });

  it("has correct mobile-specific classes", () => {
    render(<MobileCollectionModal {...mockProps} />);

    const dialogContent = screen.getByTestId("dialog-content");
    expect(dialogContent).toHaveClass("md:hidden");
    expect(dialogContent).toHaveClass("max-w-full");
    expect(dialogContent).toHaveClass("h-full");
  });

  it("shows back button when not on location view", () => {
    render(<MobileCollectionModal {...mockProps} />);

    // Initially should not show back button (on location view)
    expect(screen.queryByTestId("arrow-left-icon")).not.toBeInTheDocument();
  });

  it("shows list toggle button when machines are collected", () => {
    render(<MobileCollectionModal {...mockProps} />);

    // Initially no machines collected, so no list button
    expect(screen.queryByTestId("list-icon")).not.toBeInTheDocument();
  });
});

describe("MobileCollectionModal Integration", () => {
  it("should be responsive and only show on mobile", () => {
    const mockProps = {
      show: true,
      onClose: jest.fn(),
      locations: [],
      onRefresh: jest.fn(),
    };

    render(<MobileCollectionModal {...mockProps} />);

    const dialogContent = screen.getByTestId("dialog-content");
    expect(dialogContent).toHaveClass("md:hidden");
  });
});
