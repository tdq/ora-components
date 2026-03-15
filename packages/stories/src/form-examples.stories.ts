import { TextFieldStyle } from 'aura-components';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormBuilder } from 'aura-components';
import { PanelBuilder, PanelGap } from 'aura-components';
import { ButtonBuilder, ButtonStyle } from 'aura-components';
import { Alignment, LayoutBuilder } from 'aura-components';
import { DialogBuilder } from 'aura-components';

export default {
    title: 'Examples/Forms',
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
            ? 'p-px-48 min-h-screen -m-px-16 items-center justify-center gap-px-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
            : 'p-px-48 min-h-screen -m-px-16 gap-px-24 bg-surface'
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
    const submitClick$ = new Subject<void>();
    const resetClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (firstName$.value.trim() && lastName$.value.trim() &&
            email$.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email$.value)) {
            alert(`Form submitted!\n\nName: ${firstName$.value} ${lastName$.value}\nEmail: ${email$.value}\nPhone: ${phone$.value || 'N/A'}`);
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

    return withExampleControls(form, 'max-w-md');
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
    const submitClick$ = new Subject<void>();
    const clearClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        if (street$.value.trim() && city$.value.trim() &&
            state$.value.trim() && zipCode$.value.trim() && country$.value.trim()) {
            alert(`Address submitted!\n\n${street$.value}\n${city$.value}, ${state$.value} ${zipCode$.value}\n${country$.value}`);
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

    return withExampleControls(form, 'max-w-2xl');
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
    const submitClick$ = new Subject<void>();

    submitClick$.subscribe(() => {
        alert(`Complete Form Submitted!\n\nPerson:\n${firstName$.value} ${lastName$.value}\n${email$.value}\n\nAddress:\n${street$.value}\n${city$.value}, ${zipCode$.value}`);
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

    return withExampleControls(form, 'max-w-2xl');
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

    const submitClick$ = new Subject<void>();
    submitClick$.subscribe(() => {
        isLoading$.next(true);
        setTimeout(() => {
            isLoading$.next(false);
            alert(`Logged in as ${email$.value}`);
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

    return withExampleControls(form, 'max-w-md', true);
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
            alert(`Successfully registered ${name$.value}!`);
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
    container.className = 'p-10 min-h-[600px] w-full relative overflow-hidden flex items-center justify-center rounded-xl';

    // Add a colorful background to showcase the glass effect
    const bg = document.createElement('div');
    bg.className = 'absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500';
    container.appendChild(bg);

    // Add some decorative elements
    for (let i = 0; i < 5; i++) {
        const circle = document.createElement('div');
        const size = Math.random() * 150 + 100;
        circle.className = 'absolute rounded-full opacity-40 blur-2xl';
        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.left = `${Math.random() * 100}%`;
        circle.style.top = `${Math.random() * 100}%`;
        circle.style.backgroundColor = ['#4F46E5', '#7C3AED', '#DB2777', '#F59E0B', '#10B981'][i % 5];
        container.appendChild(circle);
    }

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(() => showDialog());

    const btn = new ButtonBuilder()
        .withCaption(of('Open Registration Dialog'))
        .withClick(() => btnClick$.next())
        .build();

    container.appendChild(btn);

    // Auto-open for convenience
    setTimeout(() => showDialog(), 500);

    return container;
};
