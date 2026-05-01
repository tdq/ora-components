import { ComboBoxStyle } from './types';
import { cn } from './styles';

interface RenderItemProps<ITEM> {
    item: ITEM;
    id: string;
    isSelected: boolean;
    isFocused: boolean;
    style: ComboBoxStyle;
    isGlass: boolean;
    caption: string;
    onSelect: (item: ITEM) => void;
    onHover?: () => void;
}

export function renderComboBoxItem<ITEM>({
    item,
    id,
    isSelected,
    isFocused,
    style,
    isGlass,
    caption,
    onSelect,
    onHover,
}: RenderItemProps<ITEM>): HTMLLIElement {
    const option = document.createElement('li');
    option.setAttribute('role', 'option');
    option.setAttribute('id', id);
    option.setAttribute('aria-selected', isSelected.toString());

    const isTonal = style === ComboBoxStyle.TONAL && !isGlass;
    const isOutlined = style === ComboBoxStyle.OUTLINED && !isGlass;

    const itemTextColor = isGlass
        ? 'text-gray-900 dark:text-white'
        : ((isSelected && isOutlined)
            ? 'text-on-primary-container'
            : (isTonal ? 'text-on-secondary-container' : 'text-on-surface'));

    // Selected state background
    const selectedBg = isGlass
        ? 'bg-white/40'
        : (isTonal ? 'bg-on-secondary-container/20' : 'bg-primary-container');

    option.className = cn(
        'px-px-16 py-px-12 cursor-pointer body-large transition-colors relative overflow-hidden',
        itemTextColor,
        isSelected && 'font-bold',
        isSelected && selectedBg,
        isFocused && 'bg-on-surface/12' // Matching test expectations
    );

    // State Layer (for focus/hover/active)
    const stateLayer = document.createElement('div');
    stateLayer.className = cn(
        'absolute inset-0 pointer-events-none transition-colors',
        isFocused && (isGlass ? 'bg-white/30' : (isTonal ? 'bg-on-secondary-container/12' : 'bg-on-surface/12')),
        'active:bg-current active:opacity-15' // Fallback for active state
    );
    option.appendChild(stateLayer);

    const content = document.createElement('span');
    content.className = 'relative z-10';
    content.textContent = caption;
    option.appendChild(content);

    option.onclick = () => onSelect(item);
    if (onHover) {
        option.onmouseenter = () => onHover();
    }

    return option;
}
