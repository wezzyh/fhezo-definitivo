import {
  CaretRight,
  List,
} from "@phosphor-icons/react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  departments,
  DepartmentItem,
} from "../../data/departments";

export default function DepartmentsMegaMenu() {
  const rootRef = useRef<HTMLDivElement>(null);

  const closeTimer = useRef<number | null>(null);

  const [open, setOpen] = useState(false);

  // IMPORTANTE:
  // começa sem categoria selecionada.
  // Assim o submenu lateral NÃO aparece ao abrir departamentos.
  const [
    activeDepartment,
    setActiveDepartment,
  ] = useState<DepartmentItem | null>(null);

  const [
    activeSubcategory,
    setActiveSubcategory,
  ] = useState<DepartmentItem | null>(null);

  /* =========================================
     CONTROLE DE ABERTURA / FECHAMENTO
  ========================================= */

  function clearCloseTimer() {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function closeMenu() {
    clearCloseTimer();

    closeTimer.current = window.setTimeout(() => {
      setOpen(false);

      setActiveDepartment(null);
      setActiveSubcategory(null);
    }, 280);
  }

  function forceClose() {
    clearCloseTimer();

    setOpen(false);
    setActiveDepartment(null);
    setActiveSubcategory(null);
  }

  /* =========================================
     CATEGORIAS
  ========================================= */

  function handleDepartmentEnter(
    department: DepartmentItem
  ) {
    clearCloseTimer();

    setActiveDepartment(department);

    // sempre reseta o terceiro nível
    // quando troca de departamento
    setActiveSubcategory(null);
  }

  function handleSubcategoryEnter(
    item: DepartmentItem
  ) {
    clearCloseTimer();

    if (item.children?.length) {
      setActiveSubcategory(item);
    } else {
      setActiveSubcategory(null);
    }
  }

  /* =========================================
     CLIQUE FORA / ESC
  ========================================= */

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        forceClose();
      }
    }

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        forceClose();
      }
    }

    document.addEventListener(
      "mousedown",
      handleMouseDown
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );

      clearCloseTimer();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="
        relative
        h-full
        shrink-0
      "
      onMouseEnter={clearCloseTimer}
      onMouseLeave={closeMenu}
    >
      {/* =====================================
          BOTÃO DEPARTAMENTOS
      ====================================== */}

      <button
        type="button"
        onMouseEnter={openMenu}
        onFocus={openMenu}
        onClick={() => {
          if (open) {
            forceClose();
          } else {
            openMenu();
          }
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className={`
          flex h-full
          min-w-[246px]
          items-center
          gap-4
          px-5

          font-display
          text-[14px]
          font-semibold
          uppercase
          tracking-[.025em]

          transition-colors
          duration-150

          ${
            open
              ? `
                bg-[#22262d]
                text-[#38cf7a]
              `
              : `
                text-white
                hover:bg-[#20242a]
                hover:text-[#38cf7a]
              `
          }
        `}
      >
        <List
          size={22}
          weight="bold"
          className="text-[#38cf7a]"
        />

        Departamentos
      </button>

      {/* =====================================
          ÁREA ABSOLUTA

          O pt-[10px] é proposital.

          A área transparente também pertence
          ao dropdown. Portanto não existe mais
          aquele "buraco" entre nav e menu.
      ====================================== */}

      <div
        className={`
          absolute
          left-0
          top-full
          z-[150]

          pt-[10px]

          transition
          duration-150

          ${
            open
              ? `
                visible
                translate-y-0
                opacity-100
                pointer-events-auto
              `
              : `
                invisible
                -translate-y-[3px]
                opacity-0
                pointer-events-none
              `
          }
        `}
        onMouseEnter={clearCloseTimer}
      >
        <div className="flex items-start">
          {/* =================================
              PRIMEIRA COLUNA
              DEPARTAMENTOS
          ================================== */}

          <div
            className="
              w-[345px]
              overflow-hidden

              rounded-[12px]

              bg-[#151821]

              p-3

              shadow-[0_18px_50px_rgba(0,0,0,.28)]
            "
          >
            <nav>
              <ul className="space-y-[2px]">
                {departments.map(
                  (department) => {
                    const active =
                      activeDepartment?.id ===
                      department.id;

                    return (
                      <li
                        key={department.id}
                      >
                        <Link
                          to={
                            department.href
                          }
                          onMouseEnter={() =>
                            handleDepartmentEnter(
                              department
                            )
                          }
                          onFocus={() =>
                            handleDepartmentEnter(
                              department
                            )
                          }
                          className={`
                            group
                            relative

                            flex
                            h-[45px]
                            items-center
                            gap-3

                            rounded-[9px]

                            px-4

                            text-[16px]
                            font-medium

                            transition-all
                            duration-150

                            ${
                              active
                                ? `
                                  bg-[#202532]
                                  text-white
                                `
                                : `
                                  text-[#e4e6eb]
                                  hover:bg-[#1b2029]
                                  hover:text-white
                                `
                            }
                          `}
                        >
                          {/* PONTO */}

                          <span
                            className={`
                              h-[8px]
                              w-[8px]

                              shrink-0

                              rounded-full

                              transition-all
                              duration-150

                              ${
                                active
                                  ? `
                                    bg-[#36d77b]
                                    shadow-[0_0_11px_rgba(54,215,123,.72)]
                                  `
                                  : `
                                    bg-[#49505f]
                                  `
                              }
                            `}
                          />

                          {/* TEXTO */}

                          <span
                            className="
                              relative
                              min-w-0
                              flex-1
                            "
                          >
                            <span className="block truncate">
                              {
                                department.label
                              }
                            </span>

                            {/* LINHA VERDE */}

                            {active && (
                              <span
                                className="
                                  absolute

                                  -bottom-[11px]

                                  left-0
                                  right-2

                                  h-[2px]

                                  bg-[#38d982]
                                "
                              />
                            )}
                          </span>

                          {!!department
                            .children
                            ?.length && (
                            <CaretRight
                              size={15}
                              weight="bold"
                              className={`
                                shrink-0

                                transition-all
                                duration-150

                                ${
                                  active
                                    ? `
                                      translate-x-[2px]
                                      text-[#39d77e]
                                    `
                                    : `
                                      text-[#78808d]
                                      group-hover:text-[#aeb4bd]
                                    `
                                }
                              `}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  }
                )}
              </ul>
            </nav>
          </div>

          {/* =================================
              SEGUNDA COLUNA

              SÓ EXISTE SE HOUVER HOVER
              SOBRE UM DEPARTAMENTO
          ================================== */}

          {activeDepartment && (
            <div
              className="
                ml-[6px]

                min-h-[430px]
                w-[360px]

                rounded-[12px]

                bg-[#151821]

                px-7
                py-7

                text-white

                shadow-[12px_18px_48px_rgba(0,0,0,.24)]

                animate-[departmentPanelIn_.14s_ease-out]
              "
              onMouseEnter={
                clearCloseTimer
              }
            >
              {/* CABEÇALHO */}

              <h3
                className="
                  font-display

                  text-[18px]
                  font-semibold

                  text-white
                "
              >
                {activeDepartment.label}
              </h3>

              <div
                className="
                  mt-2

                  h-[2px]
                  w-[90px]

                  bg-[#37d57c]
                "
              />

              <Link
                to={activeDepartment.href}
                className="
                  mt-7

                  inline-flex

                  text-[14px]
                  font-semibold

                  text-[#aeb4be]

                  transition-colors
                  duration-150

                  hover:text-[#42dc86]
                "
              >
                Ver todos em{" "}
                {activeDepartment.label}
              </Link>

              {/* SUBCATEGORIAS */}

              {!!activeDepartment
                .children?.length && (
                <ul className="mt-6 space-y-[3px]">
                  {activeDepartment.children.map(
                    (item) => {
                      const active =
                        activeSubcategory
                          ?.id === item.id;

                      return (
                        <li key={item.id}>
                          <Link
                            to={
                              item.href
                            }
                            onMouseEnter={() =>
                              handleSubcategoryEnter(
                                item
                              )
                            }
                            className={`
                              group

                              flex
                              min-h-[42px]

                              items-center
                              justify-between

                              gap-4

                              rounded-[8px]

                              px-3

                              text-[14px]

                              transition-all
                              duration-150

                              ${
                                active
                                  ? `
                                    bg-[#202532]
                                    text-white
                                  `
                                  : `
                                    text-[#c2c6cd]
                                    hover:bg-[#1c212a]
                                    hover:text-white
                                  `
                              }
                            `}
                          >
                            <span>
                              {item.label}
                            </span>

                            {!!item
                              .children
                              ?.length && (
                              <CaretRight
                                size={13}
                                weight="bold"
                                className={`
                                  ${
                                    active
                                      ? `
                                        text-[#3bd981]
                                      `
                                      : `
                                        text-[#767e8b]
                                        group-hover:text-[#aab0ba]
                                      `
                                  }
                                `}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    }
                  )}
                </ul>
              )}
            </div>
          )}

          {/* =================================
              TERCEIRA COLUNA
              CASCATA
          ================================== */}

          {activeSubcategory
            ?.children?.length ? (
            <div
              className="
                ml-[6px]

                min-h-[430px]
                w-[320px]

                rounded-[12px]

                bg-[#151821]

                px-7
                py-7

                text-white

                shadow-[12px_18px_48px_rgba(0,0,0,.24)]

                animate-[departmentCascadeIn_.14s_ease-out]
              "
              onMouseEnter={
                clearCloseTimer
              }
            >
              <h4
                className="
                  font-display

                  text-[17px]
                  font-semibold

                  text-white
                "
              >
                {activeSubcategory.label}
              </h4>

              <div
                className="
                  mt-2

                  h-[2px]
                  w-[74px]

                  bg-[#38d77e]
                "
              />

              <Link
                to={
                  activeSubcategory.href
                }
                className="
                  mt-6

                  inline-block

                  text-[14px]
                  font-semibold

                  text-[#aeb4be]

                  transition-colors

                  hover:text-[#3eda84]
                "
              >
                Ver todos
              </Link>

              <ul className="mt-5 space-y-[3px]">
                {activeSubcategory.children.map(
                  (child) => (
                    <li key={child.id}>
                      <Link
                        to={child.href}
                        className="
                          flex
                          min-h-[40px]

                          items-center

                          rounded-[8px]

                          px-3

                          text-[14px]

                          text-[#c3c7ce]

                          transition-colors
                          duration-150

                          hover:bg-[#202532]
                          hover:text-white
                        "
                      >
                        {child.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}