import { FormBuilder } from '@tdq/ora-components';
import { of, BehaviorSubject, Subject } from 'rxjs';
import { createButton, createControlStrip } from './story-helpers';

export default {
    title: 'Components/Form',
    tags: ['stable', 'glass', 'reactive'],
};

export const RegistrationForm = () => {
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const enabled$ = new BehaviorSubject(true);
    const error$ = new BehaviorSubject('');

    const form = new FormBuilder()
        .withCaption(of('User Registration'))
        .withDescription(of('Please fill out the form below to create your account.'))
        .withEnabled(enabled$)
        .withError(error$);

    const fields = form.withFields(2);

    fields.addTextField(1, 1).withLabel(of('First Name')).withValue(firstName$);
    fields.addTextField(2, 1).withLabel(of('Last Name')).withValue(lastName$);
    fields.addEmailField(1, 2).withLabel(of('Email'));
    fields.addPasswordField(1, 2).withLabel(of('Password'));

    const toolbar = form.withToolbar();
    toolbar.addTextButton().withCaption(of('Cancel'));
    toolbar.addSecondaryButton().withCaption(of('Reset'));
    toolbar.withPrimaryButton().withCaption(of('Submit')).withClick(() => {});

    const container = document.createElement('div');
    container.className = 'p-px-48 -m-px-16 flex flex-col gap-px-24 transition-all duration-1000';

    // Controls for the story
    const errorBtn = createButton('Toggle Error', () => {
        error$.next(error$.value ? '' : 'There are some errors in the form.');
    }).build();

    const disableBtn = createButton('Toggle Enabled', () => {
        enabled$.next(!enabled$.value);
    }).build();

    container.appendChild(createControlStrip([errorBtn, disableBtn]));
    container.appendChild(form.build());

    return container;
};

export const GlassForm = () => {
    const form = new FormBuilder()
        .asGlass()
        .withCaption(of('Glass Effect Form'))
        .withDescription(of('This form uses the glass effect styling.'))
        .withError(of('This is a global error message.'));

    const fields = form.withFields(2);
    fields.addEmailField(1, 1).withLabel(of('Email Address'));
    fields.addPasswordField(2, 1).withLabel(of('Password'));
    fields.addComboBoxField(1, 2).withCaption(of('Selection'));
    fields.addCheckBox(1, 2).withCaption(of('I agree to the terms'));

    const toolbar = form.withToolbar();
    toolbar.addTextButton().withCaption(of('Back'));
    toolbar.withPrimaryButton().withCaption(of('Proceed'));

    const container = document.createElement('div');
    container.className = 'flex-1 p-px-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500';
    container.appendChild(form.build());

    return container;
};

export const GlobalError = () => {
    const form = new FormBuilder()
        .withCaption(of('User Registration'))
        .withDescription(of('This email address is already registered. Please use a different one.'))
        .withError(of('Submission failed: duplicate email'));

    const fields = form.withFields(1);
    fields.addTextField(1, 1)
        .withLabel(of('Email'))
        .withValue(new BehaviorSubject('john@example.com'));

    const toolbar = form.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(of('Submit'))
        .withClick(() => {});
    toolbar.addSecondaryButton()
        .withCaption(of('Cancel'));

    const container = document.createElement('div');
    container.className = 'p-px-48 -m-px-16';
    container.appendChild(form.build());
    return container;
};
