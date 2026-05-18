import {
    PanelBuilder,
    PanelGap,
    TabsBuilder,
    FormBuilder,
    ButtonBuilder,
    ButtonStyle,
    LabelBuilder,
    LayoutBuilder,
    LayoutGap,
    themeManager,
} from '@tdq/ora-components';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { createActionLog } from './story-helpers';

export default {
    title: 'Examples/SettingsPanel',
    tags: ['autodocs', 'enterprise', 'reactive'],
};

export const Default = () => {
    const { element: logElement, log } = createActionLog();

    // ── Profile Tab State ──────────────────────────────────────────────
    const profileName$ = new BehaviorSubject('Jane Smith');
    const profileEmail$ = new BehaviorSubject('jane.smith@acme.com');
    const profilePhone$ = new BehaviorSubject('+1 (555) 987-6543');

    // ── Notifications Tab State ────────────────────────────────────────
    const emailNotif$ = new BehaviorSubject(true);
    const pushNotif$ = new BehaviorSubject(false);
    const smsNotif$ = new BehaviorSubject(true);

    // ── Security Tab State ─────────────────────────────────────────────
    const currentPassword$ = new BehaviorSubject('');
    const newPassword$ = new BehaviorSubject('');
    const confirmPassword$ = new BehaviorSubject('');

    // Password strength derived from newPassword$
    const passwordStrength$ = newPassword$.pipe(
        map(pwd => {
            if (pwd.length === 0) return { level: '', css: '', label: '' };
            if (pwd.length < 6) return { level: 'weak', css: 'text-red-500', label: 'Weak' };
            if (pwd.length <= 10) return { level: 'medium', css: 'text-yellow-500', label: 'Medium' };
            return { level: 'strong', css: 'text-green-500', label: 'Strong' };
        }),
    );

    const strengthCaption$ = passwordStrength$.pipe(
        map(s => (s.label ? `Password strength: ${s.label}` : '')),
    );
    const strengthClass$ = passwordStrength$.pipe(map(s => s.css));

    // Passwords match validation
    const passwordsMatch$ = combineLatest([newPassword$, confirmPassword$]).pipe(
        map(([newPwd, confPwd]) => {
            if (confPwd.length === 0) return { msg: '', css: '' };
            return newPwd === confPwd
                ? { msg: '\u2713 Passwords match', css: 'text-green-500' }
                : { msg: '\u2717 Passwords do not match', css: 'text-red-500' };
        }),
    );
    const matchCaption$ = passwordsMatch$.pipe(map(m => m.msg));
    const matchClass$ = passwordsMatch$.pipe(map(m => m.css));

    // Change Password button enabled state
    const changePasswordEnabled$ = combineLatest([
        currentPassword$,
        passwordStrength$,
        newPassword$,
        confirmPassword$,
    ]).pipe(
        map(([curr, strength, newPwd, confPwd]) => {
            return (
                curr.length > 0 &&
                strength.level === 'strong' &&
                newPwd.length > 0 &&
                newPwd === confPwd
            );
        }),
    );

    // ── Build Profile Tab ──────────────────────────────────────────────
    const profileForm = new FormBuilder()
        .withCaption(of('Profile Information'))
        .withDescription(of('Manage your personal details.'));

    const profileFields = profileForm.withFields(2);
    profileFields.addTextField(1, 1).withLabel(of('Full Name')).withValue(profileName$);
    profileFields.addTextField(1, 2).withLabel(of('Email')).withValue(profileEmail$);
    profileFields.addTextField(2, 1).withLabel(of('Phone')).withValue(profilePhone$);

    const profileToolbar = profileForm.withToolbar();
    profileToolbar
        .withPrimaryButton()
        .withCaption(of('Save Profile'))
        .withClick(() => {
            log(
                `Profile saved \u2014 Name: ${profileName$.value}, ` +
                    `Email: ${profileEmail$.value}, Phone: ${profilePhone$.value}`,
            );
        });

    // ── Build Notifications Tab ────────────────────────────────────────
    const notifForm = new FormBuilder()
        .withCaption(of('Notification Preferences'))
        .withDescription(of('Choose how you receive notifications.'));

    const notifFields = notifForm.withFields(1);
    notifFields.addCheckBox(1, 1).withCaption(of('Email notifications')).withValue(emailNotif$);
    notifFields.addCheckBox(1, 1).withCaption(of('Push notifications')).withValue(pushNotif$);
    notifFields.addCheckBox(1, 1).withCaption(of('SMS notifications')).withValue(smsNotif$);

    const notifToolbar = notifForm.withToolbar();
    notifToolbar
        .withPrimaryButton()
        .withCaption(of('Save Preferences'))
        .withClick(() => {
            log(
                `Notifications saved \u2014 Email: ${emailNotif$.value}, ` +
                    `Push: ${pushNotif$.value}, SMS: ${smsNotif$.value}`,
            );
        });

    // ── Build Security Tab ─────────────────────────────────────────────
    const securityForm = new FormBuilder()
        .withCaption(of('Change Password'))
        .withDescription(of('Update your account password.'));

    const securityFields = securityForm.withFields(1);
    securityFields
        .addPasswordField(1, 1)
        .withLabel(of('Current Password'))
        .withValue(currentPassword$);
    securityFields
        .addPasswordField(1, 1)
        .withLabel(of('New Password'))
        .withValue(newPassword$);
    securityFields
        .addPasswordField(1, 1)
        .withLabel(of('Confirm Password'))
        .withValue(confirmPassword$);

    const securityToolbar = securityForm.withToolbar();
    securityToolbar
        .withPrimaryButton()
        .withCaption(of('Change Password'))
        .withEnabled(changePasswordEnabled$)
        .withClick(() => {
            log('Password changed successfully');
            currentPassword$.next('');
            newPassword$.next('');
            confirmPassword$.next('');
        });

    // Wrap security form + reactive indicator labels in a vertical stack
    const securityLayout = new LayoutBuilder().asVertical().withGap(LayoutGap.NONE);

    securityLayout.addSlot().withContent(securityForm);

    const strengthLabel = new LabelBuilder()
        .withCaption(strengthCaption$)
        .withClass(strengthClass$);
    securityLayout.addSlot().withContent(strengthLabel);

    const matchLabel = new LabelBuilder()
        .withCaption(matchCaption$)
        .withClass(matchClass$);
    securityLayout.addSlot().withContent(matchLabel);

    // ── Build Appearance Tab ───────────────────────────────────────────
    const appearanceLayout = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);

    const currentThemeLabel = new LabelBuilder()
        .withCaption(of('Current theme:'))
        .withClass(of('font-semibold'));
    appearanceLayout.addSlot().withContent(currentThemeLabel);

    const themeValueLabel = new LabelBuilder().withCaption(
        themeManager.theme$.pipe(map(t => `"${t}"`)),
    );
    appearanceLayout.addSlot().withContent(themeValueLabel);

    const themeButtons = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);

    themeButtons.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Light'))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => themeManager.setTheme('light')),
    );
    themeButtons.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Dark'))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => themeManager.setTheme('dark')),
    );
    themeButtons.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('System'))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => themeManager.setTheme('system')),
    );
    themeButtons.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Green'))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => themeManager.setTheme('green')),
    );

    appearanceLayout.addSlot().withContent(themeButtons);

    // ── Build Tabs ─────────────────────────────────────────────────────
    const tabs = new TabsBuilder()
        .withCaption(of('Settings'))
        .withDescription(of('Configure your account settings'));

    tabs.addTab().withCaption(of('Profile')).withContent(profileForm);
    tabs.addTab().withCaption(of('Notifications')).withContent(notifForm);
    tabs.addTab().withCaption(of('Security')).withContent(securityLayout);
    tabs.addTab().withCaption(of('Appearance')).withContent(appearanceLayout);

    // ── Build Panel ────────────────────────────────────────────────────
    const panel = new PanelBuilder().withGap(PanelGap.LARGE).withContent(tabs);

    // ── Assemble ───────────────────────────────────────────────────────
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-16 p-px-24 max-w-2xl';
    container.appendChild(panel.build());
    container.appendChild(logElement);

    return container;
};
