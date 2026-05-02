import { FormBuilder, LabelSize, TabsBuilder } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';

export function createSettings(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex-1 overflow-y-auto p-px-24';

    const profileForm = new FormBuilder()
        .withCaption(of('Profile Settings'))
        .withDescription(of('Manage your account information and preferences.'));

    const profileFields = profileForm.withFields();
    profileFields.addHeading().withCaption(of('Profile Information')).withSize(LabelSize.MEDIUM);
    profileFields.addTextField().withLabel(of('Full Name')).withValue(new BehaviorSubject('Admin User'));
    profileFields.addTextField().withLabel(of('Username')).withValue(new BehaviorSubject('admin_user'));
    profileFields.addTextField().withLabel(of('Email Address')).withValue(new BehaviorSubject('admin@example.com'));
    profileFields.addComboBoxField().withCaption(of('Timezone')).withItems(of(['UTC', 'EST', 'PST', 'CET', 'JST']));

    const profileToolbar = profileForm.withToolbar();
    profileToolbar.withPrimaryButton().withCaption(of('Save Changes'));
    profileToolbar.addSecondaryButton().withCaption(of('Cancel'));

    const securityForm = new FormBuilder()
        .withCaption(of('Security Settings'))
        .withDescription(of('Manage your password and authentication options.'));

    const securityFields = securityForm.withFields();
    securityFields.addHeading().withCaption(of('Change Password')).withSize(LabelSize.MEDIUM);
    securityFields.addPasswordField().withLabel(of('Current Password'));
    securityFields.addPasswordField().withLabel(of('New Password'));
    securityFields.addPasswordField().withLabel(of('Confirm Password'));
    securityFields.addHeading().withCaption(of('Two-Factor Authentication')).withSize(LabelSize.MEDIUM);
    securityFields.addCheckBox().withCaption(of('Enable 2FA')).withValue(new BehaviorSubject(false));

    const securityToolbar = securityForm.withToolbar();
    securityToolbar.withPrimaryButton().withCaption(of('Update Security'));

    const notificationsForm = new FormBuilder()
        .withCaption(of('Notification Preferences'))
        .withDescription(of('Choose how and when you receive notifications.'));

    const notificationsFields = notificationsForm.withFields();
    notificationsFields.addHeading().withCaption(of('Notifications')).withSize(LabelSize.MEDIUM);
    notificationsFields.addCheckBox().withCaption(of('Email Notifications')).withValue(new BehaviorSubject(true));
    notificationsFields.addCheckBox().withCaption(of('SMS Notifications')).withValue(new BehaviorSubject(false));
    notificationsFields.addCheckBox().withCaption(of('Push Notifications')).withValue(new BehaviorSubject(true));
    notificationsFields.addCheckBox().withCaption(of('Weekly Digest')).withValue(new BehaviorSubject(true));
    notificationsFields.addCheckBox().withCaption(of('Security Alerts')).withValue(new BehaviorSubject(true));
    notificationsFields.addCheckBox().withCaption(of('Marketing Emails')).withValue(new BehaviorSubject(false));

    const notificationsToolbar = notificationsForm.withToolbar();
    notificationsToolbar.withPrimaryButton().withCaption(of('Save Preferences'));

    const tabs = new TabsBuilder();
    tabs.addTab().withCaption(of('Profile')).withContent(profileForm);
    tabs.addTab().withCaption(of('Security')).withContent(securityForm);
    tabs.addTab().withCaption(of('Notifications')).withContent(notificationsForm);

    const tabsEl = tabs.build();
    tabsEl.classList.add('max-w-2xl');

    container.appendChild(tabsEl);

    return container;
}
