export interface ComponentBuilder {
    build(): HTMLElement;
}

export interface PopupBuilder {
    show(): void;
    close(): void;
}
