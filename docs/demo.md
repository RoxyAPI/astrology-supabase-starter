# Demo page

One file, `demo/index.html`. No framework, no build step, no package manager.

It exists so the repo has something to look at and something to test for accessibility. It is not the product,
and a fork that deletes it still works.

It calls the two functions with the project anon key and renders the results with the published web components
from the CDN, so the markup stays small and the reading looks the same as it does anywhere else those
components are used.

Rules it follows: semantic HTML, one container, system font stack, no colour outside the component tokens, and
text that reads at 390px as well as 1440px. Contrast is checked rather than assumed.
