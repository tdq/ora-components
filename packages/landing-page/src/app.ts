import 'ora-components/style.css'
import { ThemeManager } from 'ora-components';
import { router } from './routes';

const app = document.getElementById('app')!;
ThemeManager.getInstance();

// Build and append the router outlet
app.appendChild(router.build());
