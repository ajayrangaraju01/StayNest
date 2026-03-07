import { useEffect } from "react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return <div className="toast">OK {message}</div>;
}
