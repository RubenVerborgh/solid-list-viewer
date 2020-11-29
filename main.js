import context from '@solid/context';
import { Parser, Store } from 'n3';

const { rdfs } = context['@context'];

let currentList = null;
let currentSocket = null;

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
  if (listUrl !== currentList)
    elements.list.replaceChildren();
  currentList = listUrl;

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
  elements.list.replaceChildren(...labels.map(label => {
    const item = document.createElement('li');
    item.textContent = label.value;
    return item;
  }));

  // Subscribe to updates
  await subscribe(listUrl, response.headers.get('updates-via'));
}

// Subscribes to updates to the given resource via a WebSocket
async function subscribe(resource, socketUrl) {
  // Close any existing socket for a different URL
  if (currentSocket && currentSocket.socketUrl !== socketUrl)  {
    currentSocket.close();
    currentSocket = null;
  }

  // Subscribe to the resource via a WebSocket
  if (socketUrl) {
    // Create a new WebSocket if needed
    if (!currentSocket) {
      currentSocket = new WebSocket(socketUrl, 'solid/0.1.0-alpha');
      await new Promise(resolve => currentSocket.addEventListener('open', resolve));
      currentSocket.socketUrl = socketUrl;
      currentSocket.addEventListener('message', message => {
        if (message.data.startsWith('pub '))
          refreshCurrentList();
      });
    }
    // Subscribe to the resource
    currentSocket.send(`sub ${resource}`);
  }
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
