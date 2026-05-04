import { requestJSON } from '../shared/js/caching.js';

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, String(v));
  }
  for (const c of Array.isArray(children) ? children : [children]) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
};

const renderCourseGrid = (branches) => {
  const grid = document.querySelector('.course-grid');
  if (!grid) return;

  grid.innerHTML = ''; // Clear samples

  // Convert object to sorted array of [code, name]
  const branchList = Object.entries(branches).sort((a, b) => a[1].localeCompare(b[1]));

  branchList.forEach(([code, name]) => {
    const card = el('div', { class: 'course-rect' }, [
      el('div', { class: 'course-code' }, code),
      el('div', { class: 'course-name' }, name)
    ]);

    card.addEventListener('click', () => {
      // Future: Navigate to branch detail page
      // window.location.href = `./view/?code=${code}`;
      console.log(`Branch selected: ${code} - ${name}`);
    });

    grid.append(card);
  });
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const path = '/assets/db/tnea/college/brnc.json';
    const data = await requestJSON([path]);
    const branches = data[path];

    if (branches) {
      renderCourseGrid(branches);
      const count = Object.keys(branches).length;
      const titleEl = document.querySelector('.page-title');
      if (titleEl) {
        titleEl.textContent = `Explore ${count} Engineering Branches`;
      }
    }
  } catch (err) {
    console.error('Failed to load branches:', err);
  }
});
