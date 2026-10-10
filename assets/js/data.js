/* Loading of the site's JSON content, with clear errors the pages can show. */
import { rootPath } from './ui.js';

const cache = new Map();

export async function loadJSON(relativePath) {
  const url = rootPath() + relativePath;
  if (cache.has(url)) return cache.get(url);
  const request = fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Could not load ${relativePath} (${response.status})`);
    return response.json();
  });
  cache.set(url, request);
  try {
    return await request;
  } catch (error) {
    cache.delete(url); // allow a retry after a network failure
    throw error;
  }
}

export const getModules = async () => (await loadJSON('assets/data/modules.json')).modules;
export const getModuleIndex = (moduleId) => loadJSON(`assets/data/${moduleId}/index.json`);
export const getStudy = (moduleId, studyId) => loadJSON(`assets/data/${moduleId}/study-${studyId}.json`);
export const getQuizBank = (moduleId) => loadJSON(`assets/data/${moduleId}/quiz-bank.json`);
