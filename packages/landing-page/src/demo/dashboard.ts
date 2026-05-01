import { LayoutBuilder, LayoutGap, SlotSize, registerDestroy } from 'ora-components';
import { router } from '../routes';
import { createSidebar } from './dashboard/sidebar';
import { createDashboardHeader } from './dashboard/header';
import { createOverview } from './dashboard/overview';
import { createAnalytics } from './dashboard/analytics';
import { createCustomers } from './dashboard/customers';
import { createOrders } from './dashboard/orders';
import { createSettings } from './dashboard/settings';
import { createLedger } from './dashboard/ledger';
import { createPL } from './dashboard/pl';
import { createBalanceSheet } from './dashboard/balance-sheet';
import { createPayables } from './dashboard/payables';

export function createDashboardDemo(): HTMLElement {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE);

    // Sidebar
    layout.addSlot().withSize(SlotSize.FIT).withContent({ build: () => createSidebar() });

    // Main Content Area
    const mainContent = document.createElement('div');
    mainContent.className = 'flex-1 flex flex-col h-screen overflow-hidden bg-background';

    // Dashboard Header
    mainContent.appendChild(createDashboardHeader());

    // Dashboard Content Outlet
    const contentOutlet = document.createElement('div');
    contentOutlet.className = 'flex-1 overflow-hidden flex flex-col';

    const routeSub = router.currentRoute$.subscribe(route => {
        contentOutlet.innerHTML = '';
        const page = route?.params?.page;

        let content: HTMLElement;
        switch (page) {
            case 'analytics':     content = createAnalytics(); break;
            case 'customers':     content = createCustomers(); break;
            case 'orders':        content = createOrders(); break;
            case 'settings':      content = createSettings(); break;
            case 'ledger':        content = createLedger(); break;
            case 'pl':            content = createPL(); break;
            case 'balance-sheet': content = createBalanceSheet(); break;
            case 'payables':      content = createPayables(); break;
            default:              content = createOverview(); break;
        }
        contentOutlet.appendChild(content);
    });
    registerDestroy(contentOutlet, () => routeSub.unsubscribe());

    mainContent.appendChild(contentOutlet);

    layout.addSlot().withContent({ build: () => mainContent });

    const element = layout.build();
    element.classList.add('h-screen', 'w-full');
    return element;
}
