import './navigation.js';
import { initContactPage } from './contact.js';
import { initHomePage } from './home.js';

if (document.body.classList.contains('page-index')) {
  initHomePage();
}

if (document.body.classList.contains('page-contact')) {
  initContactPage();
}
