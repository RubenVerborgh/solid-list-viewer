import context from '@solid/context';
import { Parser, Store } from 'n3';

const { rdfs } = context['@context'];

// Collect elements by ID
const elements = {};
document.querySelectorAll('[id]').forEach(e => elements[e.id] = e);

// Refresh the list whenever changed
refreshCurrentList();
elements.source.addEventListener('change', refreshCurrentList);

// Refreshes the list selected by the user
async function refreshCurrentList() {
  await displayList(elements.source.value);
}

// Loads and displays the list at the given URL
async function displayList(listUrl) {
  // Clear the list
  elements.list.replaceChildren();

  // Fetch and parse the triples
  const response = await fetch(listUrl, {
    headers: {
      'Accept': 'text/turtle',
    },
  });
  const rdfString = response.status === 200 ? await response.text() : '';
  const store = await parseRdf(rdfString);

  // Display the list
  const labels = store.getObjects(null, `${rdfs}label`, null);
  elements.list.append(...labels.map(label => {
    const item = document.createElement('li');
    item.textContent = label.value;
    return item;
  }));
}

// Parses the RDF into triples
async function parseRdf(rdfString) {
  return new Promise(async (resolve, reject) => {
    const store = new Store();
    const parser = new Parser();
    parser.parse(rdfString, (error, quad) => {
      if (error)
        reject(error);
      else if (quad)
        store.addQuad(quad);
      else
        resolve(store);
    });
  });
}
