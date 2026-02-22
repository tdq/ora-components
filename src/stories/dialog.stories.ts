import { DialogBuilder, DialogSize } from '../components/dialog';
import { of, Subject } from 'rxjs';
import { ButtonBuilder } from '../components/button';
import { TabsBuilder } from '../components/tabs';
import { FormBuilder } from '../components/form';

export default {
    title: 'Components/Dialog',
};

export const Basic = () => {
    const container = document.createElement('div');
    container.className = 'p-4 flex flex-col gap-4';

    const createDialog = (size: DialogSize = DialogSize.MEDIUM) => {
        const dialog = new DialogBuilder()
            .withCaption(of(`Dialog ${size}`))
            .withDescription(of('This is a demonstration of the Dialog component.'))
            .withSize(size)
            .withContent({
                build: () => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col gap-2';
                    div.innerHTML = `
                        <p class="text-body-medium">You can drag this dialog by its header.</p>
                        <p class="text-body-medium text-on-surface-variant">The dialog follows Material Design 3 guidelines.</p>
                    `;
                    return div;
                }
            });

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        const toolbar = dialog.withToolbar();
        toolbar.withPrimaryButton()
            .withCaption(of('Confirm'))
            .withClick(close$);
        
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(close$);

        return dialog;
    };

    const sizes = Object.values(DialogSize);
    sizes.forEach(size => {
        const btnClick$ = new Subject<void>();
        btnClick$.subscribe(() => createDialog(size).show());

        const btn = new ButtonBuilder()
            .withCaption(of(`Open ${size} Dialog`))
            .withClick(btnClick$)
            .build();
        container.appendChild(btn);
    });

    return container;
};

export const Scrollable = () => {
    const showDialog = () => {
        const dialog = new DialogBuilder()
            .withCaption(of('Scrollable Content'))
            .withDescription(of('This dialog demonstrates scrollable content.'))
            .asScrollable()
            .withHeight(of(400))
            .withContent({
                build: () => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col gap-4 p-2';
                    for (let i = 1; i <= 20; i++) {
                        const p = document.createElement('p');
                        p.textContent = `Content line ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
                        p.className = 'text-body-medium';
                        div.appendChild(p);
                    }
                    return div;
                }
            });

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        dialog.withToolbar()
            .withPrimaryButton()
            .withCaption(of('Got it'))
            .withClick(close$);

        dialog.show();
    };

    const container = document.createElement('div');
    container.className = 'p-4';

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(showDialog);

    const btn = new ButtonBuilder()
        .withCaption(of('Open Scrollable Dialog'))
        .withClick(btnClick$)
        .build();
    
    container.appendChild(btn);
    return container;
};

export const DialogWithTabs = () => {
    const container = document.createElement('div');
    container.className = 'p-10 min-h-[600px] w-full relative overflow-hidden flex items-center justify-center rounded-xl';
    
    // Add a colorful background to showcase the glass effect
    const bg = document.createElement('div');
    bg.className = 'absolute inset-0 -z-10 bg-gradient-to-br from-blue-600 via-teal-500 to-emerald-500 opacity-60';
    container.appendChild(bg);

    // Add some decorative elements
    for (let i = 0; i < 5; i++) {
        const circle = document.createElement('div');
        const size = Math.random() * 200 + 100;
        circle.className = 'absolute rounded-full opacity-30 blur-3xl animate-pulse';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.left = `${Math.random() * 80 + 10}%`;
        circle.style.top = `${Math.random() * 80 + 10}%`;
        circle.style.backgroundColor = ['#FFFFFF', '#A7F3D0', '#BAE6FD'][i % 3];
        circle.style.animationDuration = `${Math.random() * 5 + 5}s`;
        container.appendChild(circle);
    }

    const showDialog = () => {
        // 1. Create Tabs
        const tabs = new TabsBuilder()
            .asGlass()
            .withCaption(of('Account Settings'))
            .withDescription(of('Manage your profile and preferences'));

        // Tab 1: Profile Form
        const profileForm = new FormBuilder()
            .asGlass()
            .withCaption(of('Personal Information'))
            .withDescription(of('Update your personal details'));
        
        const profileFields = profileForm.withFields(2);
        profileFields.addTextField()
            .withLabel(of('First Name'))
            .withPlaceholder(of('Enter first name'));
        profileFields.addTextField()
            .withLabel(of('Last Name'))
            .withPlaceholder(of('Enter last name'));
        profileFields.addTextField()
            .withLabel(of('Email'))
            .withPlaceholder(of('Enter email address'));
        profileFields.addTextField()
            .withLabel(of('Phone'))
            .withPlaceholder(of('Enter phone number'));

        tabs.addTab()
            .withCaption(of('Profile'))
            .withContent(profileForm);

        // Tab 2: Security Form
        const securityForm = new FormBuilder()
            .asGlass()
            .withCaption(of('Security Settings'))
            .withDescription(of('Manage your password and security questions'));
        
        const securityFields = securityForm.withFields(1);
        securityFields.addPasswordField()
            .withLabel(of('Current Password'))
            .withPlaceholder(of('Enter current password'));
        securityFields.addPasswordField()
            .withLabel(of('New Password'))
            .withPlaceholder(of('Enter new password'));
        securityFields.addPasswordField()
            .withLabel(of('Confirm Password'))
            .withPlaceholder(of('Confirm new password'));

        tabs.addTab()
            .withCaption(of('Security'))
            .withContent(securityForm);

        // Tab 3: Notifications
        const notifForm = new FormBuilder()
            .asGlass()
            .withCaption(of('Notification Preferences'));
            
        const notifFields = notifForm.withFields(1);
        notifFields.addCheckBox()
            .withCaption(of('Email Notifications'));
        notifFields.addCheckBox()
            .withCaption(of('Push Notifications'));
        notifFields.addCheckBox()
            .withCaption(of('SMS Notifications'));

        tabs.addTab()
            .withCaption(of('Notifications'))
            .withContent(notifForm);


        // 2. Create Dialog containing Tabs
        const dialog = new DialogBuilder()
            .asGlass()
            .withSize(DialogSize.LARGE)
            .withContent(tabs);

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        const toolbar = dialog.withToolbar();
        
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(close$);

        toolbar.withPrimaryButton()
            .withCaption(of('Save Changes'))
            .withClick(close$);

        dialog.show();
    };

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(showDialog);

    const btn = new ButtonBuilder()
        .withCaption(of('Open Settings Dialog'))
        .withClick(btnClick$)
        .build();
    
    // Center button in container
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'z-10';
    btnWrapper.appendChild(btn);
    container.appendChild(btnWrapper);

    return container;
};

export const GlassEffect = () => {
    const container = document.createElement('div');
    container.className = 'p-10 min-h-[600px] w-full relative overflow-hidden flex items-center justify-center rounded-xl';
    
    // Add a colorful background to showcase the glass effect
    const bg = document.createElement('div');
    bg.className = 'absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-50';
    container.appendChild(bg);

    // Add some decorative elements for blur visibility
    for (let i = 0; i < 8; i++) {
        const circle = document.createElement('div');
        const size = Math.random() * 150 + 100;
        circle.className = 'absolute rounded-full opacity-40 blur-2xl animate-pulse';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.left = `${Math.random() * 100}%`;
        circle.style.top = `${Math.random() * 100}%`;
        circle.style.backgroundColor = ['#4F46E5', '#7C3AED', '#DB2777', '#F59E0B', '#10B981'][i % 5];
        circle.style.animationDelay = `${Math.random() * 5}s`;
        circle.style.animationDuration = `${Math.random() * 5 + 5}s`;
        container.appendChild(circle);
    }

    const showDialog = () => {
        const dialog = new DialogBuilder()
            .withCaption(of('Glass Effect Dialog'))
            .withDescription(of('This dialog demonstrates the semi-transparent glass effect with backdrop blur.'))
            .asGlass()
            .withContent({
                build: () => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col gap-4';
                    div.innerHTML = `
                        <p class="text-body-medium">The glass effect uses:</p>
                        <ul class="list-disc list-inside text-body-small space-y-1">
                            <li><code>bg-white/10</code> for transparency</li>
                            <li><code>backdrop-blur-md</code> for the blur</li>
                            <li><code>border-white/20</code> for the subtle edge</li>
                        </ul>
                    `;
                    return div;
                }
            });

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        const toolbar = dialog.withToolbar();
        
        toolbar.addSecondaryButton()
            .withCaption(of('Close'))
            .withClick(close$);

        toolbar.withPrimaryButton()
            .withCaption(of('Action'))
            .withClick(close$);

        dialog.show();
    };

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(showDialog);

    const btn = new ButtonBuilder()
        .withCaption(of('Open Glass Dialog'))
        .withClick(btnClick$)
        .build();
    
    container.appendChild(btn);
    return container;
};

