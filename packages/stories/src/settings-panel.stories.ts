import {
    PanelBuilder,
    PanelGap,
    TabsBuilder,
    FormBuilder,
    ButtonBuilder,
    ButtonStyle,
    LabelBuilder,
    LabelSize,
    LayoutBuilder,
    LayoutGap,
    TextFieldStyle,
    CheckboxValue,
    themeManager,
    Alignment,
    SlotSize,
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
    const profileJobTitle$ = new BehaviorSubject('Product Manager');

    const savedProfile$ = new BehaviorSubject({
        name: profileName$.value,
        email: profileEmail$.value,
        phone: profilePhone$.value,
        jobTitle: profileJobTitle$.value,
    });

    const profileEmailError$ = profileEmail$.pipe(
        map(val => {
            if (val.trim() === '') return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email format';
            return '';
        }),
    );

    const profileFormValid$ = profileEmailError$.pipe(
        map(err => err === ''),
    );

    // ── Notifications Tab State ────────────────────────────────────────
    const emailNotif$ = new BehaviorSubject<CheckboxValue>(true);
    const pushNotif$ = new BehaviorSubject<CheckboxValue>(false);
    const smsNotif$ = new BehaviorSubject<CheckboxValue>(true);
    const weeklyDigest$ = new BehaviorSubject<CheckboxValue>(true);

    // ── Security Tab State ─────────────────────────────────────────────
    const currentPassword$ = new BehaviorSubject('');
    const newPassword$ = new BehaviorSubject('');
    const confirmPassword$ = new BehaviorSubject('');

    const passwordStrength$ = newPassword$.pipe(
        map(pwd => {
            if (pwd.length === 0) return { level: '', css: '', label: '' };
            if (pwd.length < 6) return { level: 'weak', css: 'text-error', label: 'Weak' };
            if (pwd.length <= 10) return { level: 'medium', css: 'text-warning', label: 'Medium' };
            return { level: 'strong', css: 'text-success', label: 'Strong' };
        }),
    );

    const strengthCaption$ = passwordStrength$.pipe(
        map(s => (s.label ? `Password strength: ${s.label}` : '')),
    );
    const strengthClass$ = passwordStrength$.pipe(map(s => s.css));

    const passwordsMatch$ = combineLatest([newPassword$, confirmPassword$]).pipe(
        map(([newPwd, confPwd]) => {
            if (confPwd.length === 0) return { msg: '', css: '' };
            return newPwd === confPwd
                ? { msg: '✓ Passwords match', css: 'text-success' }
                : { msg: '✗ Passwords do not match', css: 'text-error' };
        }),
    );
    const matchCaption$ = passwordsMatch$.pipe(map(m => m.msg));
    const matchClass$ = passwordsMatch$.pipe(map(m => m.css));

    const changePasswordEnabled$ = combineLatest([
        currentPassword$,
        passwordStrength$,
        newPassword$,
        confirmPassword$,
    ]).pipe(
        map(([curr, strength, newPwd, confPwd]) =>
            curr.length > 0 &&
            strength.level === 'strong' &&
            newPwd.length > 0 &&
            newPwd === confPwd,
        ),
    );

    // ── Profile Tab ────────────────────────────────────────────────────
    const profileForm = new FormBuilder()
        .withCaption(of('Profile Information'))
        .withDescription(of('Manage your personal details and contact information.'));

    const profileFields = profileForm.withFields(2);

    profileFields
        .addTextField(1, 1)
        .withLabel(of('Full Name'))
        .withPlaceholder(of('Jane Smith'))
        .withValue(profileName$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    profileFields
        .addTextField(2, 1)
        .withLabel(of('Job Title'))
        .withPlaceholder(of('Product Manager'))
        .withValue(profileJobTitle$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    profileFields
        .addEmailField(1, 1)
        .withLabel(of('Email'))
        .withPlaceholder(of('jane@acme.com'))
        .withValue(profileEmail$)
        .withError(profileEmailError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    profileFields
        .addTextField(2, 1)
        .withLabel(of('Phone'))
        .withPlaceholder(of('+1 (555) 000-0000'))
        .withValue(profilePhone$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const profileToolbar = profileForm.withToolbar();
    profileToolbar.addSecondaryButton()
        .withCaption(of('Discard'))
        .withClick(() => {
            const saved = savedProfile$.value;
            profileName$.next(saved.name);
            profileEmail$.next(saved.email);
            profilePhone$.next(saved.phone);
            profileJobTitle$.next(saved.jobTitle);
        });

    profileToolbar
        .withPrimaryButton()
        .withCaption(of('Save Profile'))
        .withEnabled(profileFormValid$)
        .withClick(() => {
            savedProfile$.next({
                name: profileName$.value,
                email: profileEmail$.value,
                phone: profilePhone$.value,
                jobTitle: profileJobTitle$.value,
            });
            log(
                `Profile saved — ${profileName$.value} · ${profileJobTitle$.value} · ${profileEmail$.value}`,
            );
        });

    // ── Notifications Tab ──────────────────────────────────────────────
    const notifForm = new FormBuilder()
        .withCaption(of('Notification Preferences'))
        .withDescription(of('Choose how and when you receive updates.'));

    const notifFields = notifForm.withFields(1);
    notifFields.addCheckBox().withCaption(of('Email notifications')).withValue(emailNotif$);
    notifFields.addCheckBox().withCaption(of('Push notifications')).withValue(pushNotif$);
    notifFields.addCheckBox().withCaption(of('SMS notifications')).withValue(smsNotif$);
    notifFields.addCheckBox().withCaption(of('Weekly digest')).withValue(weeklyDigest$);

    const notifToolbar = notifForm.withToolbar();
    notifToolbar.addSecondaryButton()
        .withCaption(of('Reset'))
        .withClick(() => {
            emailNotif$.next(true as CheckboxValue);
            pushNotif$.next(false as CheckboxValue);
            smsNotif$.next(true as CheckboxValue);
            weeklyDigest$.next(true as CheckboxValue);
        });

    notifToolbar
        .withPrimaryButton()
        .withCaption(of('Save Preferences'))
        .withClick(() => {
            const on: string[] = [];
            if (emailNotif$.value === true) on.push('Email');
            if (pushNotif$.value === true) on.push('Push');
            if (smsNotif$.value === true) on.push('SMS');
            if (weeklyDigest$.value === true) on.push('Digest');
            log(`Notifications saved — active: ${on.join(', ') || 'none'}`);
        });

    // ── Security Tab ───────────────────────────────────────────────────
    const securityForm = new FormBuilder()
        .withCaption(of('Change Password'))
        .withDescription(of('Use a strong password of at least 12 characters.'));

    const securityFields = securityForm.withFields(1);
    securityFields
        .addPasswordField()
        .withLabel(of('Current Password'))
        .withPlaceholder(of('Enter current password'))
        .withValue(currentPassword$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    securityFields
        .addPasswordField()
        .withLabel(of('New Password'))
        .withPlaceholder(of('Min. 12 characters'))
        .withValue(newPassword$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    securityFields
        .addPasswordField()
        .withLabel(of('Confirm New Password'))
        .withPlaceholder(of('Repeat new password'))
        .withValue(confirmPassword$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const securityToolbar = securityForm.withToolbar();
    securityToolbar.addSecondaryButton()
        .withCaption(of('Clear'))
        .withClick(() => {
            currentPassword$.next('');
            newPassword$.next('');
            confirmPassword$.next('');
        });

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

    const securityLayout = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
    securityLayout.addSlot().withContent(securityForm);

    const strengthLabel = new LabelBuilder()
        .withCaption(strengthCaption$)
        .withClass(strengthClass$)
        .withSize(LabelSize.SMALL);
    securityLayout
        .addSlot()
        .withContent(strengthLabel)
        .withVisible(strengthCaption$.pipe(map(s => !!s)));

    const matchLabel = new LabelBuilder()
        .withCaption(matchCaption$)
        .withClass(matchClass$)
        .withSize(LabelSize.SMALL);
    securityLayout
        .addSlot()
        .withContent(matchLabel)
        .withVisible(matchCaption$.pipe(map(s => !!s)));

    // ── Appearance Tab ─────────────────────────────────────────────────
    const appearanceForm = new FormBuilder()
        .withCaption(of('Appearance'))
        .withDescription(of('Customize the look and feel of the interface.'));

    const appearanceFields = appearanceForm.withFields(1);
    appearanceFields.addHeading().withCaption(of('Theme'));

    const themeButtons = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);

    const themes: { label: string; value: string }[] = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'System', value: 'system' },
        { label: 'Green', value: 'green' },
    ];

    themes.forEach(({ label, value }) => {
        themeButtons.addSlot().withSize(SlotSize.FIT).withContent(
            new ButtonBuilder()
                .withCaption(
                    themeManager.theme$.pipe(
                        map(t => (t === value ? `✓ ${label}` : label)),
                    ),
                )
                .withStyle(
                    themeManager.theme$.pipe(
                        map(t => (t === value ? ButtonStyle.FILLED : ButtonStyle.TONAL)),
                    ),
                )
                .withClick(() => themeManager.setTheme(value)),
        );
    });

    const appearanceLayout = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    appearanceLayout.addSlot().withContent(appearanceForm);
    appearanceLayout.addSlot().withAlignment(of(Alignment.LEFT)).withContent(themeButtons);

    // ── Tabs ───────────────────────────────────────────────────────────
    const tabs = new TabsBuilder()
        .withCaption(of('Settings'))
        .withDescription(of('Manage your account, notifications, and preferences'));

    tabs.addTab().withCaption(of('Profile')).withContent(profileForm);
    tabs.addTab().withCaption(of('Notifications')).withContent(notifForm);
    tabs.addTab().withCaption(of('Security')).withContent(securityLayout);
    tabs.addTab().withCaption(of('Appearance')).withContent(appearanceLayout);

    // ── Panel ──────────────────────────────────────────────────────────
    const panel = new PanelBuilder().withGap(PanelGap.LARGE).withContent(tabs);

    const container = document.createElement('div');
    container.className = 'flex flex-col gap-px-16 p-px-24 max-w-2xl';
    container.appendChild(panel.build());
    container.appendChild(logElement);

    return container;
};
