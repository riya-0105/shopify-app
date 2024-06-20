
document.getElementById("review_create").addEventListener("click", function () {
  var reviewSection = document.getElementById("reviewSection");
  if (
    reviewSection.style.display === "none" ||
    reviewSection.style.display === ""
  ) {
    reviewSection.style.display = "block";
  } else {
    reviewSection.style.display = "none";
  }
});

// document.getElementById('uploadButton').addEventListener('click', function() {
//   var fileInput = document.getElementById('inputGroupFile02');
//   var file = fileInput.files[0];
//   var formData = new FormData();
//   formData.append('file', file);

//   fetch('/upload-endpoint', { // Replace '/upload-endpoint' with your actual upload URL
//     method: 'POST',
//     body: formData
//   })
//   .then(response => response.json())
//   .then(data => {
//     console.log('Success:', data);
//     if (data.success && data.filePath) {
//       // Display the uploaded image
//       var uploadedImageDiv = document.getElementById('uploadedImage');
//       var uploadedImagePreview = document.getElementById('uploadedImagePreview');
//       uploadedImagePreview.src = data.filePath; // The file path returned from the server
//       uploadedImageDiv.style.display = 'block';
//     }
//   })
//   .catch(error => {
//     console.error('Error:', error);
//     // Handle error (e.g., display an error message)
//   });
// });

// Show the file name on the label after file selection
document
  .querySelector(".custom-file-input")
  .addEventListener("change", function (e) {
    var fileName = document.getElementById("inputGroupFile02").files[0].name;
    var nextSibling = e.target.nextElementSibling;
    nextSibling.innerText = fileName;
  });

// graphql Request

// document.getElementById("review_submit").addEventListener("click", async function () {
//   const productID =
//     "gid://shopify/Product/" +
//     document.getElementById("review_submit").getAttribute("data-product-id");
//   console.log("product id: ", productID);
//   const url = "https://ai-image-blog-generation.myshopify.com/admin/api/2024-04/graphql.json";
//   const accessToken = "shpua_dcea80323c7c1ae11cb1e3e7c4f3ea1f";

//   const query = `
//       query {
//         product(id: "${productID}") {
//           id
//           title
//           metafields(first: 100) {
//             edges {
//               node {
//                 id
//                 key
//                 value
//               }
//             }
//           }
//         }
//       }
//     `;

//   // fetch(url, {
//   //   method: "POST",
//   //   headers: {
//   //     "Content-Type": "application/json",
//   //     "X-Shopify-Access-Token": accessToken,
//   //   },
//   //   body: JSON.stringify({ query }),
//   // })
//   //   .then((response) => response.json())
//   //   .then((data) => console.log(data))
//   //   .catch((error) => console.error("Error:", error));
  
//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       mode: "no-cors",
//       headers: {
//         "Content-Type": "application/json",
//         "X-Shopify-Access-Token": accessToken,
//       },
//       body: JSON.stringify({ query: query }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("GraphQL Response:", data);
//   } catch (error) {
//     console.error("Error fetching GraphQL:", error);
//   }
// });


document.getElementById("review_submit").addEventListener("click", async function() {
  const productID = "gid://shopify/Product/" + document.getElementById("review_submit").getAttribute("data-product-id");
  const url = "https://ai-image-blog-generation.myshopify.com/admin/api/2024-04/graphql.json";
  const accessToken = "shpua_dcea80323c7c1ae11cb1e3e7c4f3ea1f";

  const query = `query { product(id: \"${productID}\") { id title metafields(first: 100) { edges { node { id key value } } } } }`;

  console.log("query is: ", JSON.stringify({ query }));

//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       mode: "no-cors",
//       headers: {
//         "Content-Type": "application/json",
//         "X-Shopify-Access-Token": "shpua_31b5154e4709a98cb8df34bb39ba1f36",
//       },
//       body: JSON.stringify({ query }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("GraphQL Response:", data);
//   } catch (error) {
//     console.error("Error fetching GraphQL:", error);
//   }
// });



try {
  const response = await fetch("https://ai-image-blog-generation.myshopify.com/admin/api/2024-04/products/count.json", {
    mode: "no-cors",
    headers: {
      // "Content-Type": "application/json",
      "X-Shopify-Access-Token": "shpua_31b5154e4709a98cb8df34bb39ba1f36",
      "Access-Control-Allow-Origin":"*"
    },
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  console.log("GraphQL Response:", data);
} catch (error) {
  console.error("Error fetching GraphQL:", error);
}


try {
      const response = await fetch(url, {
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": "shpua_31b5154e4709a98cb8df34bb39ba1f36",
        },
        method: "POST",
        body: JSON.stringify({query}),
      });
  
      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(`HTTP error! Status: ${responseData} ${response.status}`);
      }
  
      const data = await response.json();
      console.log("GraphQL Response:", data);
    } catch (error) {
      console.error("Error fetching GraphQL:", error);
    }
  });



  
// document.getElementById("review_submit").addEventListener("click", async function(event) {
//   event.preventDefault(); // Prevent the default form submission behavior

//   const productID = "gid://shopify/Product/" + this.getAttribute("data-product-id");
//   const url = "https://ai-image-blog-generation.myshopify.com/admin/api/2024-04/graphql.json";
//   const accessToken = "shpua_dcea80323c7c1ae11cb1e3e7c4f3ea1f";

//   const query = `query { product(id: \"${productID}\") { id title metafields(first: 100) { edges { node { id key value } } } } }`;

//   console.log("GraphQL Query:", query);

//   try {
//     const response = await axios.post(url, { query }, {
//       mode: "no-cors",
//       headers: {
//         "Content-Type": "application/json",
//         "X-Shopify-Access-Token": accessToken,
//       },
//     });

//     console.log("GraphQL Response:", response.data);

//     // Handle the GraphQL response here (e.g., update UI with product details)

//   } catch (error) {
//     console.error("Error fetching GraphQL:", error);
//     // Handle errors (e.g., display an error message to the user)
//   }
// });
