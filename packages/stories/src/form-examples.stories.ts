import { TextFieldStyle } from '@tdq/ora-components';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormBuilder } from '@tdq/ora-components';
import { PanelBuilder, PanelGap } from '@tdq/ora-components';
import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { Alignment, LayoutBuilder, LayoutGap, SlotSize } from '@tdq/ora-components';
import { DialogBuilder } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';
import { StepsBuilder } from '@tdq/ora-components';
import { createActionLog, createButton, createGlassBackdrop } from './story-helpers';

export default {
    title: 'Examples/FormExamples',
    tags: ['autodocs', 'stable', 'glass', 'reactive', 'enterprise'],
};

const withExampleControls = (form: FormBuilder, maxWidthClass: string = 'max-w-md', isGlass: boolean = false) => {
    const panel = new PanelBuilder()
        .withGap(PanelGap.LARGE)
        .withContent(form)
        .asGlass(isGlass)
        .withClass(of(`w-full ${maxWidthClass}`));

    const layout = new LayoutBuilder()
        .asVertical()
        .withClass(of(isGlass
            ? 'p-px-48 -m-px-16 items-center justify-center gap-px-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
            : 'p-px-48 -m-px-16 gap-px-24'
        ));

    layout.addSlot()
        .withAlignment(of(Alignment.CENTER))
        .withContent(panel);

    return layout.build();
};

export const PersonInformationForm = () => {
    // Form state
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');
    const phone$ = new BehaviorSubject('');

    // Validation errors
    const firstNameError$ = firstName$.pipe(
        map(val => val.trim() === '' ? 'First name is required' : '')
    );

    const lastNameError$ = lastName$.pipe(
        map(val => val.trim() === '' ? 'Last name is required' : '')
    );

    const emailError$ = email$.pipe(
        map(val => {
            if (val.trim() === '') return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email format';
            return '';
        })
    );

    const phoneError$ = phone$.pipe(
        map(val => {
            if (val.trim() === '') return '';
            if (!/^\+?[\d\s\-()]+$/.test(val)) return 'Invalid phone format';
            return '';
        })
    );

    // Form validity
    const isFormValid$ = combineLatest([
        firstNameError$,
        lastNameError$,
        emailError$,
        phoneError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Form actions
    const { element: actionLog, log } = createActionLog();
    const submitClick$ = new Subject<void>();
    const resetClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (firstName$.value.trim() && lastName$.value.trim() &&
            email$.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email$.value)) {
            log(`Form submitted!\nName: ${firstName$.value} ${lastName$.value}\nEmail: ${email$.value}\nPhone: ${phone$.value || 'N/A'}`);
        }
    });

    resetClick$.subscribe(() => {
        firstName$.next('');
        lastName$.next('');
        email$.next('');
        phone$.next('');
    });

    const form = new FormBuilder()
        .withCaption(of('Person Information'));

    const fields = form.withFields();
    fields.addTextField()
        .withLabel(of('First Name'))
        .withPlaceholder(of('Enter your first name'))
        .withValue(firstName$)
        .withError(firstNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addTextField()
        .withLabel(of('Last Name'))
        .withPlaceholder(of('Enter your last name'))
        .withValue(lastName$)
        .withError(lastNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addEmailField()
        .withLabel(of('Email'))
        .withPlaceholder(of('example@domain.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addTextField()
        .withLabel(of('Phone (Optional)'))
        .withPlaceholder(of('+1 (555) 123-4567'))
        .withValue(phone$)
        .withError(phoneError$)
        .withStyle(of(TextFieldStyle.TONAL));

    const toolbar = form.withToolbar();
    toolbar.addSecondaryButton()
        .withCaption(of('Reset'))
        .withClick(() => resetClick$.next());

    toolbar.withPrimaryButton()
        .withCaption(of('Submit'))
        .withEnabled(isFormValid$)
        .withClick(() => submitClick$.next());

    const formEl = withExampleControls(form, 'max-w-md');
    const wrapper = document.createElement('div');
    wrapper.appendChild(formEl);
    wrapper.appendChild(actionLog);
    return wrapper;
};

export const AddressForm = () => {
    // Form state
    const street$ = new BehaviorSubject('');
    const city$ = new BehaviorSubject('');
    const state$ = new BehaviorSubject('');
    const zipCode$ = new BehaviorSubject('');
    const country$ = new BehaviorSubject('');

    // Validation errors
    const streetError$ = street$.pipe(
        map(val => val.trim() === '' ? 'Street address is required' : '')
    );

    const cityError$ = city$.pipe(
        map(val => val.trim() === '' ? 'City is required' : '')
    );

    const stateError$ = state$.pipe(
        map(val => val.trim() === '' ? 'State/Province is required' : '')
    );

    const zipCodeError$ = zipCode$.pipe(
        map(val => {
            if (val.trim() === '') return 'ZIP/Postal code is required';
            if (!/^[\d\-\s]+$/.test(val)) return 'Invalid ZIP code format';
            return '';
        })
    );

    const countryError$ = country$.pipe(
        map(val => val.trim() === '' ? 'Country is required' : '')
    );

    // Form validity
    const isFormValid$ = combineLatest([
        streetError$,
        cityError$,
        stateError$,
        zipCodeError$,
        countryError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Form actions
    const { element: actionLog, log } = createActionLog();
    const submitClick$ = new Subject<void>();
    const clearClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (street$.value.trim() && city$.value.trim() &&
            state$.value.trim() && zipCode$.value.trim() && country$.value.trim()) {
            log(`Address submitted!\n${street$.value}\n${city$.value}, ${state$.value} ${zipCode$.value}\n${country$.value}`);
        }
    });

    clearClick$.subscribe(() => {
        street$.next('');
        city$.next('');
        state$.next('');
        zipCode$.next('');
        country$.next('');
    });

    const form = new FormBuilder()
        .withCaption(of('Address Information'));

    const fields = form.withFields(2);

    fields.addTextField(1, 2)
        .withLabel(of('Street Address'))
        .withPlaceholder(of('123 Main Street'))
        .withValue(street$)
        .withError(streetError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(1, 1)
        .withLabel(of('City'))
        .withPlaceholder(of('New York'))
        .withValue(city$)
        .withError(cityError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(2, 1)
        .withLabel(of('State/Province'))
        .withPlaceholder(of('NY'))
        .withValue(state$)
        .withError(stateError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(1, 1)
        .withLabel(of('ZIP/Postal Code'))
        .withPlaceholder(of('10001'))
        .withValue(zipCode$)
        .withError(zipCodeError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addTextField(2, 1)
        .withLabel(of('Country'))
        .withPlaceholder(of('United States'))
        .withValue(country$)
        .withError(countryError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const toolbar = form.withToolbar();
    toolbar.addTextButton()
        .withCaption(of('Clear'))
        .withClick(() => clearClick$.next());

    toolbar.withPrimaryButton()
        .withCaption(of('Save Address'))
        .withEnabled(isFormValid$)
        .withClick(() => submitClick$.next());

    const formEl = withExampleControls(form, 'max-w-2xl');
    const wrapper = document.createElement('div');
    wrapper.appendChild(formEl);
    wrapper.appendChild(actionLog);
    return wrapper;
};

export const CombinedForm = () => {
    // Person Information State
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');

    // Address State
    const street$ = new BehaviorSubject('');
    const city$ = new BehaviorSubject('');
    const zipCode$ = new BehaviorSubject('');

    // Validation
    const firstNameError$ = firstName$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const lastNameError$ = lastName$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const emailError$ = email$.pipe(
        map(val => {
            if (val.trim() === '') return 'Required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email';
            return '';
        })
    );

    const streetError$ = street$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const cityError$ = city$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    const zipCodeError$ = zipCode$.pipe(
        map(val => val.trim() === '' ? 'Required' : '')
    );

    // Form validity
    const isFormValid$ = combineLatest([
        firstNameError$,
        lastNameError$,
        emailError$,
        streetError$,
        cityError$,
        zipCodeError$
    ]).pipe(
        map(errors => errors.every(error => error === ''))
    );

    // Actions
    const { element: actionLog, log } = createActionLog();
    const submitClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        log(`Complete Form Submitted!\nPerson:\n${firstName$.value} ${lastName$.value}\n${email$.value}\n\nAddress:\n${street$.value}\n${city$.value}, ${zipCode$.value}`);
    });

    const form = new FormBuilder()
        .withCaption(of('Registration Form'));

    const fields = form.withFields(2);

    fields.addHeading(1, 2).withCaption(of('Personal Information'));

    fields.addTextField(1, 1)
        .withLabel(of('First Name'))
        .withPlaceholder(of('John'))
        .withValue(firstName$)
        .withError(firstNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addTextField(2, 1)
        .withLabel(of('Last Name'))
        .withPlaceholder(of('Doe'))
        .withValue(lastName$)
        .withError(lastNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addEmailField(1, 2)
        .withLabel(of('Email'))
        .withPlaceholder(of('john.doe@example.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addHeading(1, 2).withCaption(of('Address'));

    fields.addTextField(1, 2)
        .withLabel(of('Street Address'))
        .withPlaceholder(of('123 Main St'))
        .withValue(street$)
        .withError(streetError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addTextField(1, 1)
        .withLabel(of('City'))
        .withPlaceholder(of('New York'))
        .withValue(city$)
        .withError(cityError$)
        .withStyle(of(TextFieldStyle.TONAL));

    fields.addTextField(2, 1)
        .withLabel(of('ZIP Code'))
        .withPlaceholder(of('10001'))
        .withValue(zipCode$)
        .withError(zipCodeError$)
        .withStyle(of(TextFieldStyle.TONAL));

    const toolbar = form.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(of('Complete Registration'))
        .withEnabled(isFormValid$)
        .withClick(() => submitClick$.next());

    const formEl = withExampleControls(form, 'max-w-2xl');
    const wrapper = document.createElement('div');
    wrapper.appendChild(formEl);
    wrapper.appendChild(actionLog);
    return wrapper;
};

export const GlassLoginForm = () => {
    const email$ = new BehaviorSubject('');
    const password$ = new BehaviorSubject('');
    const isLoading$ = new BehaviorSubject(false);

    const emailError$ = email$.pipe(
        map(val => {
            if (val.trim() === '') return '';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email';
            return '';
        })
    );

    const isFormValid$ = combineLatest([email$, password$, emailError$]).pipe(
        map(([email, password, error]) => email.length > 0 && password.length > 0 && error === '')
    );

    const { element: actionLog, log } = createActionLog();
    const submitClick$ = new Subject<void>();
    submitClick$.subscribe(() => {
        isLoading$.next(true);
        setTimeout(() => {
            isLoading$.next(false);
            log(`Logged in as ${email$.value}`);
        }, 2000);
    });

    const form = new FormBuilder()
        .asGlass()
        .withCaption(of('Sign In'))
        .withDescription(of('Enter your credentials to access your account'));

    const fields = form.withFields();
    fields.addEmailField()
        .withLabel(of('Email'))
        .withPlaceholder(of('your@email.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addPasswordField()
        .withLabel(of('Password'))
        .withPlaceholder(of('••••••••'))
        .withValue(password$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const toolbar = form.withToolbar();
    toolbar.withPrimaryButton()
        .withCaption(isLoading$.pipe(map(loading => loading ? 'Signing in...' : 'Sign In')))
        .withEnabled(combineLatest([isFormValid$, isLoading$]).pipe(map(([valid, loading]) => valid && !loading)))
        .withClick(() => submitClick$.next());

    const formEl = withExampleControls(form, 'max-w-md', true);
    const wrapper = document.createElement('div');
    wrapper.appendChild(formEl);
    wrapper.appendChild(actionLog);
    return wrapper;
};

export const GlassSignupForm = () => {
    const name$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');
    const password$ = new BehaviorSubject('');
    const confirmPassword$ = new BehaviorSubject('');

    const passwordError$ = combineLatest([password$, confirmPassword$]).pipe(
        map(([p, c]) => (c.length > 0 && p !== c) ? 'Passwords do not match' : '')
    );

    const isFormValid$ = combineLatest([name$, email$, password$, confirmPassword$, passwordError$]).pipe(
        map(([n, e, p, c, err]) => n.length > 0 && e.includes('@') && p.length >= 8 && p === c && err === '')
    );

    const form = new FormBuilder()
        .asGlass()
        .withCaption(of('Create Account'))
        .withDescription(of('Join our community today'));

    const fields = form.withFields(2);

    fields.addTextField(1, 2)
        .withLabel(of('Full Name'))
        .withPlaceholder(of('John Doe'))
        .withValue(name$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addEmailField(1, 2)
        .withLabel(of('Email Address'))
        .withPlaceholder(of('john@example.com'))
        .withValue(email$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addPasswordField(1, 1)
        .withLabel(of('Password'))
        .withPlaceholder(of('Min. 8 characters'))
        .withValue(password$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    fields.addPasswordField(2, 1)
        .withLabel(of('Confirm'))
        .withPlaceholder(of('Repeat password'))
        .withValue(confirmPassword$)
        .withError(passwordError$)
        .withStyle(of(TextFieldStyle.OUTLINED));

    const toolbar = form.withToolbar();

    toolbar.addTextButton()
        .withCaption(of('Sign In Instead'))
        .withStyle(of(ButtonStyle.TEXT));

    toolbar.withPrimaryButton()
        .withCaption(of('Create Account'))
        .withEnabled(isFormValid$);

    return withExampleControls(form, 'max-w-xl', true);
};

export const GlassRegistrationDialog = () => {
    const { element: actionLog, log } = createActionLog();

    // Form state
    const name$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');
    const password$ = new BehaviorSubject('');

    // Validation
    const isFormValid$ = combineLatest([name$, email$, password$]).pipe(
        map(([n, e, p]) => n.length > 0 && e.includes('@') && p.length >= 8)
    );

    const showDialog = () => {
        const form = new FormBuilder()
            .withDescription(of('Enter your information to create an account.'));

        const fields = form.withFields();
        fields.addTextField()
            .withLabel(of('Full Name'))
            .withPlaceholder(of('John Doe'))
            .withValue(name$)
            .withStyle(of(TextFieldStyle.OUTLINED));

        fields.addEmailField()
            .withLabel(of('Email Address'))
            .withPlaceholder(of('john@example.com'))
            .withValue(email$)
            .withStyle(of(TextFieldStyle.OUTLINED));

        fields.addPasswordField()
            .withLabel(of('Password'))
            .withPlaceholder(of('At least 8 characters'))
            .withValue(password$)
            .withStyle(of(TextFieldStyle.OUTLINED));

        const dialog = new DialogBuilder()
            .withCaption(of('Create Account'))
            .asGlass()
            .withContent(form);

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        const register$ = new Subject<void>();
        register$.subscribe(() => {
            log(`Successfully registered ${name$.value}!`);
            dialog.close();
        });

        const toolbar = dialog.withToolbar();
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(() => close$.next());

        toolbar.withPrimaryButton()
            .withCaption(of('Register'))
            .withEnabled(isFormValid$)
            .withClick(() => register$.next());

        dialog.show();
    };

    const container = document.createElement('div');
    container.className = 'flex-1 p-10 w-full relative overflow-hidden flex items-center justify-center';

    // Add a colorful glass backdrop
    const backdrop = createGlassBackdrop('from-indigo-500 via-purple-500 to-pink-500', 5, 'opacity-40');
    container.appendChild(backdrop);

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(() => showDialog());

    const btn = new ButtonBuilder()
        .withCaption(of('Open Registration Dialog'))
        .withClick(() => btnClick$.next())
        .build();

    container.appendChild(btn);

    // Wrap with action log
    const wrapper = document.createElement('div');
    wrapper.appendChild(container);
    wrapper.appendChild(actionLog);

    return wrapper;
};

export const MultiStepWizard = () => {
    const currentStep$ = new BehaviorSubject(0);
    const { element: actionLog, log } = createActionLog();

    // ── Step 0: Personal Information ──
    const firstName$ = new BehaviorSubject('');
    const lastName$ = new BehaviorSubject('');
    const email$ = new BehaviorSubject('');

    const firstNameError$ = firstName$.pipe(
        map(v => v.trim() ? '' : 'First name is required')
    );
    const lastNameError$ = lastName$.pipe(
        map(v => v.trim() ? '' : 'Last name is required')
    );
    const emailError$ = email$.pipe(
        map(v => {
            if (!v.trim()) return 'Email is required';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email format';
            return '';
        })
    );

    const step0Valid$ = combineLatest([firstNameError$, lastNameError$, emailError$]).pipe(
        map(errors => errors.every(e => !e))
    );

    // ── Step 1: Address ──
    const street$ = new BehaviorSubject('');
    const city$ = new BehaviorSubject('');
    const zipCode$ = new BehaviorSubject('');

    const streetError$ = street$.pipe(
        map(v => v.trim() ? '' : 'Street is required')
    );
    const cityError$ = city$.pipe(
        map(v => v.trim() ? '' : 'City is required')
    );
    const zipCodeError$ = zipCode$.pipe(
        map(v => v.trim() ? '' : 'ZIP code is required')
    );

    const step1Valid$ = combineLatest([streetError$, cityError$, zipCodeError$]).pipe(
        map(errors => errors.every(e => !e))
    );

    // ── Current step validity ──
    const currentStepValid$ = combineLatest([currentStep$, step0Valid$, step1Valid$]).pipe(
        map(([step, s0v, s1v]) => {
            if (step === 0) return s0v;
            if (step === 1) return s1v;
            return true; // Confirm step — always valid
        })
    );

    // ── Step 0: Personal Form ──
    const personalForm = new FormBuilder()
        .withCaption(of('Personal Information'));

    const personalFields = personalForm.withFields();
    personalFields.addTextField()
        .withLabel(of('First Name'))
        .withPlaceholder(of('John'))
        .withValue(firstName$)
        .withError(firstNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    personalFields.addTextField()
        .withLabel(of('Last Name'))
        .withPlaceholder(of('Doe'))
        .withValue(lastName$)
        .withError(lastNameError$)
        .withStyle(of(TextFieldStyle.TONAL));

    personalFields.addEmailField()
        .withLabel(of('Email'))
        .withPlaceholder(of('john@example.com'))
        .withValue(email$)
        .withError(emailError$)
        .withStyle(of(TextFieldStyle.TONAL));

    // ── Step 1: Address Form ──
    const addressForm = new FormBuilder()
        .withCaption(of('Address'));

    const addressFields = addressForm.withFields();
    addressFields.addTextField()
        .withLabel(of('Street'))
        .withPlaceholder(of('123 Main Street'))
        .withValue(street$)
        .withError(streetError$)
        .withStyle(of(TextFieldStyle.TONAL));

    addressFields.addTextField()
        .withLabel(of('City'))
        .withPlaceholder(of('New York'))
        .withValue(city$)
        .withError(cityError$)
        .withStyle(of(TextFieldStyle.TONAL));

    addressFields.addTextField()
        .withLabel(of('ZIP Code'))
        .withPlaceholder(of('10001'))
        .withValue(zipCode$)
        .withError(zipCodeError$)
        .withStyle(of(TextFieldStyle.TONAL));

    // ── Step 2: Confirm (read-only summary) ──
    const confirmLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    confirmLayout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Review your information'))
            .withClass(of('text-headline-small font-bold'))
    );

    confirmLayout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Please confirm your details before submitting.'))
            .withClass(of('text-body-medium text-on-surface-variant'))
    );

    const summaryRows: { label: string; value$: BehaviorSubject<string> }[] = [
        { label: 'First Name', value$: firstName$ },
        { label: 'Last Name',  value$: lastName$ },
        { label: 'Email',      value$: email$ },
        { label: 'Street',     value$: street$ },
        { label: 'City',       value$: city$ },
        { label: 'ZIP Code',   value$: zipCode$ },
    ];

    summaryRows.forEach(({ label, value$ }) => {
        const row = new LayoutBuilder()
            .asHorizontal()
            .withGap(LayoutGap.MEDIUM)
            .withAlignment(of(Alignment.LEFT));

        row.addSlot()
            .withSize(SlotSize.THIRD)
            .withContent(
                new LabelBuilder()
                    .withCaption(of(label))
                    .withClass(of('text-sm font-medium text-on-surface-variant'))
            );

        row.addSlot()
            .withContent(
                new LabelBuilder()
                    .withCaption(value$.pipe(map(v => v || '—')))
                    .withClass(of('text-sm text-on-surface'))
            );

        confirmLayout.addSlot().withContent(row);
    });

    // ── Step indicator ──
    const steps = new StepsBuilder()
        .asGlass()
        .withActiveStep(currentStep$)
        .withStepClick(i => {
            // Allow jumping back to a previously-completed step; never skip ahead past validation.
            if (i < currentStep$.value) currentStep$.next(i);
        });

    steps.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    steps.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    steps.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    // ── Content: LayoutBuilder with visibility-gated slots ──
    const contentLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.NONE);

    contentLayout.addSlot()
        .withVisible(currentStep$.pipe(map(s => s === 0)))
        .withContent(personalForm);

    contentLayout.addSlot()
        .withVisible(currentStep$.pipe(map(s => s === 1)))
        .withContent(addressForm);

    contentLayout.addSlot()
        .withVisible(currentStep$.pipe(map(s => s === 2)))
        .withContent(confirmLayout);

    // ── Navigation: LayoutBuilder with visibility-gated slots ──
    const backBtn = createButton('← Back', () => {
        if (currentStep$.value > 0) currentStep$.next(currentStep$.value - 1);
    });

    const nextBtn = createButton('Next →', () => {
        if (currentStep$.value < 2) currentStep$.next(currentStep$.value + 1);
    }, ButtonStyle.FILLED).withEnabled(currentStepValid$);

    const submitBtn = new ButtonBuilder()
        .withCaption(of('Submit'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => {
            log('Form submitted!');
            log(`Name: ${firstName$.value} ${lastName$.value}`);
            log(`Email: ${email$.value}`);
            log(`Address: ${street$.value}, ${city$.value} ${zipCode$.value}`);
        })
        .withEnabled(currentStep$.pipe(map(step => step === 2)));

    const navLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    navLayout.addSlot()
        .withSize(SlotSize.FIT)
        .withAlignment(of(Alignment.LEFT))
        .withVisible(currentStep$.pipe(map(s => s > 0)))
        .withContent(backBtn);

    navLayout.addSlot(); // spacer

    navLayout.addSlot()
        .withSize(SlotSize.FIT)
        .withAlignment(of(Alignment.RIGHT))
        .withVisible(currentStep$.pipe(map(s => s < 2)))
        .withContent(nextBtn);

    navLayout.addSlot()
        .withSize(SlotSize.FIT)
        .withAlignment(of(Alignment.RIGHT))
        .withVisible(currentStep$.pipe(map(s => s === 2)))
        .withContent(submitBtn);

    // ── Assemble inner layout ──
    const wizardLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    wizardLayout.addSlot().withContent(steps);
    wizardLayout.addSlot().withContent(contentLayout);
    wizardLayout.addSlot().withContent(navLayout);

    // ── Glass card ──
    const wizardCard = new PanelBuilder()
        .asGlass()
        .withGap(PanelGap.EXTRA_LARGE)
        .withClass(of('w-full max-w-lg'))
        .withContent(wizardLayout);

    // ── Gradient outer container ──
    const outerContainer = document.createElement('div');
    outerContainer.className = 'p-12 -m-4 flex flex-col items-center min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500';
    outerContainer.appendChild(wizardCard.build());
    outerContainer.appendChild(actionLog);

    return outerContainer;
};
