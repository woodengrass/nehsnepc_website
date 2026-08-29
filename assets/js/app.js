import './navigation.js';

if (document.body.classList.contains('page-index')) {
  import('./home.js').then(({ initHomePage }) => initHomePage());
} else if (document.body.classList.contains('page-about')) {
  import('./about.js').then(({ initAboutPage }) => initAboutPage());
} else if (document.body.classList.contains('page-contact')) {
  import('./contact.js').then(({ initContactPage }) => initContactPage());
}
