import React, {
  CSSProperties,
  MouseEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useState
} from "react";
import { ContentBox } from "./ContentBox";

export const MenuOption = ({
  children,
  active,
  onSelect
}: {
  children: ReactNode;
  active: boolean;
  onSelect: MouseEventHandler<HTMLAnchorElement>;
}) => {
  return (
    <li className={`${active ? " active" : ""}`}>
      <a href="#" onClick={onSelect} className={`btn`}>
        {children}
      </a>
    </li>
  );
};

type MenuOption = {
  value: string;
  label: string;
};

export const MenuBox = ({
  title = "menu",
  text = "Please choose an option:",
  onAccept,
  onCancel,
  options,
  keyboardFocus = true,
  style = {}
}: {
  title?: string;
  text?: string;
  onAccept?: (value: MenuOption) => void;
  onCancel?: () => void;
  options: MenuOption[];
  keyboardFocus?: boolean;
  style?: CSSProperties;
}) => {
  const [confirmState, setConfirmState] = useState<null | 1 | 0>(null);
  const [selected, setSelected] = useState<string | undefined>(
    [...options].shift()?.value
  );

  const accept = useCallback(() => {
    const currentIdx = options.findIndex((d) => d.value === selected);
    const result = options[currentIdx];
    if (result && onAccept) onAccept(result);
  }, [selected, onAccept, options]);

  const cancel = useCallback(() => {
    if (onCancel) onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!keyboardFocus) return;
    const handleArrows = (e: KeyboardEvent) => {
      console.log(e.code.toString());
      const currentIdx = options.findIndex((d) => d.value === selected);
      switch (e.code.toString()) {
        case "ArrowLeft": {
          setConfirmState(confirmState === null || confirmState === 1 ? 0 : 1);
          break;
        }
        case "ArrowRight": {
          setConfirmState(confirmState === null || confirmState === 0 ? 1 : 0);
          break;
        }
        case "ArrowUp": {
          const idx = currentIdx - 1;
          console.log(currentIdx, idx);
          if (idx < 0) {
            setSelected([...options].pop()?.value);
          } else {
            setSelected([...options][idx]?.value);
          }
          break;
        }
        // down
        case "ArrowDown": {
          const idx = currentIdx + 1;
          console.log(currentIdx, idx);
          if (idx >= options.length) {
            setSelected([...options].shift()?.value);
          } else {
            setSelected([...options][idx]?.value);
          }
          break;
        }

        case "Enter": {
          if (confirmState === 1) accept();
          else if (confirmState === 0) cancel();
          break;
        }

        case "Escape": {
          cancel();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleArrows);

    return () => window.removeEventListener("keydown", handleArrows);
  }, [selected, onAccept, onCancel, confirmState]);

  return (
    <ContentBox style={style} title={title}>
      {" "}
      <p>{text}</p>
      <ul className="menu">
        {(options || []).map((opt) => (
          <MenuOption
            key={opt.value}
            active={selected === opt.value}
            onSelect={() => setSelected(opt.value)}
          >
            {opt.label}
          </MenuOption>
        ))}
      </ul>
      {(onAccept || onCancel) && (
        <div className="buttons">
          {onAccept && (
            <a
              href="#"
              onClick={accept}
              className={`btn ${confirmState === 1 ? "active" : ""}`}
            >
              OK
            </a>
          )}
          {onCancel && (
            <a
              href="#"
              onClick={cancel}
              className={`btn ${confirmState === 0 ? "active" : ""}`}
            >
              Cancel
            </a>
          )}
        </div>
      )}
    </ContentBox>
  );
};
