import { FormBuilder } from '../components/form';
import { of, BehaviorSubject, Subject } from 'rxjs';

export default {
    title: 'Components/Form',
};

export const RegistrationForm = () => {
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const isGlass$ = new BehaviorSubject(false);
    const enabled$ = new BehaviorSubject(true);
    const error$ = new BehaviorSubject('');

    const form = new FormBuilder()
        .withCaption(of('User Registration'))
        .withDescription(of('Please fill out the form below to create your account.'))
        .withEnabled(enabled$)
        .withError(error$);

    if (isGlass$.value) form.asGlass();

    const fields = form.withFields(2);
    
    fields.addTextField(1, 1).withLabel(of('First Name')).withValue(firstName$);
    fields.addTextField(2, 1).withLabel(of('Last Name')).withValue(lastName$);
    fields.addTextField(1, 2).withLabel(of('Email'));

    const toolbar = form.withToolbar();
    toolbar.addTextButton().withCaption(of('Cancel'));
    toolbar.addSecondaryButton().withCaption(of('Reset'));
    toolbar.withPrimaryButton().withCaption(of('Submit')).withClick(new Subject<void>());

    const container = document.createElement('div');
    container.className = 'p-px-24 flex flex-col gap-px-24';

    // Controls for the story
    const controls = document.createElement('div');
    controls.className = 'flex gap-px-16 mb-px-24 p-px-16 bg-surface-variant rounded-small';
    
    const glassBtn = document.createElement('button');
    glassBtn.textContent = 'Toggle Glass';
    glassBtn.onclick = () => {
        isGlass$.next(!isGlass$.value);
        // Form needs to be re-built or we need to handle dynamic asGlass
        alert('Re-render needed for glass effect toggle in this story');
    };
    controls.appendChild(glassBtn);

    const errorBtn = document.createElement('button');
    errorBtn.textContent = 'Toggle Error';
    errorBtn.onclick = () => {
        error$.next(error$.value ? '' : 'There are some errors in the form.');
    };
    controls.appendChild(errorBtn);

    const disableBtn = document.createElement('button');
    disableBtn.textContent = 'Toggle Enabled';
    disableBtn.onclick = () => {
        enabled$.next(!enabled$.value);
    };
    controls.appendChild(disableBtn);

    container.appendChild(controls);
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
    fields.addTextField(1, 1).withLabel(of('Field 1'));
    fields.addNumberField(2, 1).withLabel(of('Field 2'));
    fields.addComboBoxField(1, 2).withCaption(of('Selection'));
    fields.addCheckBox(1, 2).withCaption(of('I agree to the terms'));

    const toolbar = form.withToolbar();
    toolbar.addTextButton().withCaption(of('Back'));
    toolbar.withPrimaryButton().withCaption(of('Proceed'));

    const container = document.createElement('div');
    container.className = 'p-px-48 bg-gradient-to-br from-primary to-secondary min-h-screen';
    container.appendChild(form.build());

    return container;
};
