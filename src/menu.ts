/**
 * メニューバー。機能仕様書 13 章 (F-09)。
 * OS のメニューバーに倣い、クリックで開き、開いている間は他のメニューへホバーで切り替わる。
 */
import type { Actions } from './actions';

type MenuItem =
  | {
      type: 'command';
      label: string;
      shortcut?: string;
      run: () => void;
      /** トグル項目のみ。真のときチェックを表示する */
      checked?: () => boolean;
    }
  | { type: 'submenu'; label: string; items: MenuItem[] };

type Menu = { label: string; items: MenuItem[] };

export type MenuBar = { closeMenus: () => void };

function buildMenus(actions: Actions): Menu[] {
  return [
    {
      label: 'ファイル',
      items: [
        { type: 'command', label: '新規作成', shortcut: 'N', run: actions.newDocument },
        {
          type: 'submenu',
          label: '書き出し',
          items: [
            { type: 'command', label: 'PNG', shortcut: 'P', run: actions.exportPng },
            { type: 'command', label: 'SVG', shortcut: 'S', run: actions.exportSvg },
          ],
        },
      ],
    },
    {
      label: '編集',
      items: [
        { type: 'command', label: 'キャンバスサイズを変更…', run: actions.changeCanvasSize },
      ],
    },
    {
      label: '表示',
      items: [
        {
          type: 'command',
          label: 'ガイド表示',
          shortcut: 'G',
          run: actions.toggleGuide,
          checked: actions.isGuideVisible,
        },
        {
          type: 'command',
          label: 'ハイライト表示',
          run: actions.toggleHighlight,
          checked: actions.isHighlightVisible,
        },
      ],
    },
  ];
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** チェック / ラベル / ショートカット（または下位メニューの矢印）の 3 区画を作る */
function createItemButton(label: string, trailing: string, isArrow: boolean): HTMLButtonElement {
  const button = element('button', 'item');
  button.type = 'button';
  button.setAttribute('role', 'menuitem');

  const check = element('span', 'item__check');
  const name = element('span', 'item__label');
  name.textContent = label;
  const tail = element('span', isArrow ? 'item__arrow' : 'item__shortcut');
  tail.textContent = trailing;

  button.append(check, name, tail);
  return button;
}

export function attachMenuBar(host: HTMLElement, actions: Actions): MenuBar {
  const bar = element('nav', 'menubar');
  bar.setAttribute('role', 'menubar');
  bar.setAttribute('aria-label', 'メインメニュー');

  /** 開いたときにチェック状態を反映する処理 */
  const checkRefreshers: Array<() => void> = [];
  const openable: Array<{ root: HTMLElement; title: HTMLButtonElement }> = [];

  const closeMenus = (): void => {
    for (const { root, title } of openable) {
      root.classList.remove('is-open');
      title.setAttribute('aria-expanded', 'false');
    }
  };

  const isAnyOpen = (): boolean => openable.some(({ root }) => root.classList.contains('is-open'));

  const openMenu = (root: HTMLElement, title: HTMLButtonElement): void => {
    closeMenus();
    for (const refresh of checkRefreshers) refresh();
    root.classList.add('is-open');
    title.setAttribute('aria-expanded', 'true');
  };

  function createList(items: MenuItem[], isSub: boolean): HTMLUListElement {
    const list = element('ul', isSub ? 'menu__list menu__list--sub' : 'menu__list');
    list.setAttribute('role', 'menu');

    for (const item of items) {
      const row = document.createElement('li');

      if (item.type === 'submenu') {
        row.className = 'item-row item-row--parent';
        const button = createItemButton(item.label, '▸', true);
        button.setAttribute('aria-haspopup', 'true');
        row.append(button, createList(item.items, true));
      } else {
        row.className = 'item-row';
        const button = createItemButton(item.label, item.shortcut ?? '', false);

        const { checked } = item;
        if (checked) {
          button.setAttribute('role', 'menuitemcheckbox');
          checkRefreshers.push(() => {
            const on = checked();
            button.classList.toggle('is-checked', on);
            button.setAttribute('aria-checked', String(on));
          });
        }

        button.addEventListener('click', () => {
          closeMenus();
          item.run();
        });
        row.append(button);
      }
      list.append(row);
    }
    return list;
  }

  for (const menu of buildMenus(actions)) {
    const root = element('div', 'menu');

    const title = element('button', 'menu__title');
    title.type = 'button';
    title.textContent = menu.label;
    title.setAttribute('aria-haspopup', 'true');
    title.setAttribute('aria-expanded', 'false');

    title.addEventListener('click', () => {
      if (root.classList.contains('is-open')) closeMenus();
      else openMenu(root, title);
    });

    // 開いている間は、別のメニュー名に乗せるだけで切り替わる
    title.addEventListener('pointerenter', () => {
      if (isAnyOpen() && !root.classList.contains('is-open')) openMenu(root, title);
    });

    root.append(title, createList(menu.items, false));
    bar.append(root);
    openable.push({ root, title });
  }

  host.prepend(bar);

  // メニュー外をクリックしたときは、閉じるだけでその操作を通さない
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!isAnyOpen()) return;
      if (event.target instanceof Node && bar.contains(event.target)) return;
      closeMenus();
      event.stopPropagation();
      event.preventDefault();
    },
    true,
  );

  return { closeMenus };
}
