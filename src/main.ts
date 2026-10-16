import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './style.css';
import { mountApp } from './ui/app.ts';

mountApp(document.querySelector<HTMLElement>('#app')!);
