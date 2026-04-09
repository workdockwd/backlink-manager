fetch('http://localhost:3001/api/backlinks/bookmark?context=global', {
  headers: {
    'Authorization': 'Bearer test'
  }
}).then(res => {
  console.log('Status:', res.status);
  return res.text();
}).then(text => {
  console.log('Body:', text);
}).catch(err => {
  console.error(err);
});
