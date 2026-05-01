export function renderComboBoxList(id?: string): HTMLUListElement {
    const listbox = document.createElement('ul');
    listbox.setAttribute('role', 'listbox');
    if (id) {
        listbox.id = id;
    }
    listbox.className = 'py-px-8 max-h-px-256 overflow-y-auto';
    return listbox;
}

export function renderNoResults(): HTMLLIElement {
    const noResult = document.createElement('li');
    noResult.className = 'px-px-16 py-px-8 text-on-surface-variant body-medium';
    noResult.textContent = 'No results';
    return noResult;
}
