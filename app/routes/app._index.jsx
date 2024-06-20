import {
  Page,
  BlockStack,
  Text,
  Image,
  Button,
  Pagination,
  IndexTable,
  Layout,
  Card,
  TextField,
  Spinner,
  Box,
  Modal,
  InlineStack,
} from "@shopify/polaris";
import { PieChart, Pie, Tooltip, Cell, Legend } from "recharts";
import {
  useActionData,
  useLoaderData,
  useSubmit,
  useNavigate,
  useNavigation,
} from "@remix-run/react";
import { useState, useCallback, useEffect, useRef } from "react";
import { scrapeAmazonReviews } from "../api/webScappingReviews.jsx";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node";
import { queryReviewApi } from "../api/reviewNlp.jsx";

export const loader = async ({ request }) => {
  const { cors, admin } = await authenticate.admin(request);

  const query = `
        query AllProducts($cursor: String) {
          products(first: 10, after: $cursor) {
            edges {
              cursor
              node {
                id
                title
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

  const variables = { cursor: "" };
  const res = await admin.graphql(query, variables);
  const allProductsData = await res.json();

  return cors(json({ allProductsData }));
};
export const action = async ({ request }) => {
  const { cors, admin } = await authenticate.admin(request);
  const formData = await request.formData();

  if (formData.get("cursor")) {
    const cursor = formData.get("cursor");
    const page = formData.get("page");

    const query = `
        query {
          products(${page === `nextPage` ? `first: 10, after: "${cursor}"` : `last: 10, before: "${cursor}"`}) {
            edges {
              cursor
              node {
                id
                title
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

    // const variables = { cursor };
    const res = await admin.graphql(query);
    const allProductsData = await res.json();

    return cors(json({ allProductsData }));
  } else if (formData.get("url")) {
    const reviewList = await scrapeAmazonReviews(
      formData.get("url"),
      formData.get("count"),
    );
    console.log("reviews list is ", reviewList);
    const sentimentList = await queryReviewApi(reviewList);
    console.log("Sentiment list is: ", sentimentList);
    // return {reviewList, sentimentList};
    return sentimentList;
  } else if (formData.get("Id")) {
    const productId = `gid://shopify/Product/${formData.get("Id")}`;
    console.log("product id is: ", productId);

    const currentMetaResponse = await admin.graphql(`
    query {
      product(id: "${productId}") {
        id
        title
        metafields(first: 100) {
          edges {
            node {
              id
              key
              value
            }
          }
        }
      }
    }
  `);

    const jsonResponse = await currentMetaResponse.json();
    const product = jsonResponse.data.product;

    let metafields = [];
    const title = product.title;

    console.log("meta fields are: ", product.metafields.edges);

    if (
      product.metafields &&
      product.metafields.edges &&
      product.metafields.edges.length > 0
    ) {
      metafields = await Promise.all(
        product.metafields.edges.map(async (edge) => {
          if (edge.node.key === "review_list") {
            const newReview = formData.get("reviewList");

            const combinedReviews = [...existingReviews, newReview];

            await admin.graphql(
              `mutation productUpdate($input: ProductInput!) {
              productUpdate(input: $input) {
                product {
                  id
                  metafields(first: 250) {
                    edges {
                      node {
                        id
                        key
                        value
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
              {
                variables: {
                  input: {
                    id: productId,
                    metafields: [
                      {
                        key: "review_list",
                        value: JSON.stringify(combinedReviews),
                        type: "string",
                      },
                    ],
                  },
                },
              },
            );

            return {
              id: edge.node.id,
              key: edge.node.key,
              value: combinedReviews,
            };
          }
        }),
      );
    } else {
      const metaResponse = await admin.graphql(
        `mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              metafields(first: 100) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            input: {
              id: productId,
              metafields: [
                {
                  key: "review_list",
                  value: JSON.stringify(formData.get("reviewList")),
                  type: "string",
                },
              ],
            },
          },
        },
      );

      const metaData = await metaResponse.json();
      console.log(
        "the metadata is: ",
        metaData.data.productUpdate.product.metafields.edges,
        metaData.data.productUpdate.userErrors,
      );
    }
    const sentimentList = await queryReviewApi(formData.get("reviewList"));
    console.log("Sentiment list is: ", sentimentList);
    return sentimentList;
  }
};

export default function ProductList() {
  // variable
  const sentimentList = useActionData();
  const COLORS = ["#7B241C", "#F1C40F", "#2980B9"];
  const data = useActionData();
  const [sentimentData, setSentimentData] = useState([]);
  const [row, setRow] = useState([]);
  const [productReviewList, setProductReviewList] = useState([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [count, setCount] = useState(20);
  // useEffect(() => {
  //   console.log("review list in action is: ", reviewList);
  //   setProductReviewList(reviewList || []);
  //   // const sentimentAnalysisList = await queryReviewApi(reviewList);
  //   // console.log("sentiment analysis report is: ", sentimentAnalysisList);
  // }, [reviewList]);

  // useEffect(() => {
  //   console.log("sentiment list in action is: ", sentimentList);
  //   setSentimentData(sentimentList || []);

  // }, [sentimentList]);

  // useEffect(() => {
  //   if (reviewList && reviewList.length > 0) {
  //     setProductReviewList(reviewList);
  //   }
  // }, [reviewList]);

  useEffect(() => {
    if (sentimentList && sentimentList.length > 0) {
      // Calculate sentiment counts
      const sentimentCounts = {
        Positive: 0,
        Neutral: 0,
        Negative: 0,
      };

      sentimentList.forEach((item) => {
        if (item.label === "Positive") {
          sentimentCounts.Positive++;
        } else if (item.label === "Neutral") {
          sentimentCounts.Neutral++;
        } else if (item.label === "Negative") {
          sentimentCounts.Negative++;
        }
      });

      // Calculate percentages
      const totalCount = sentimentList.length;
      const percentageData = {
        Positive: (sentimentCounts.Positive / totalCount) * 100,
        Neutral: (sentimentCounts.Neutral / totalCount) * 100,
        Negative: (sentimentCounts.Negative / totalCount) * 100,
      };

      setSentimentData([
        { name: "Positive", value: percentageData.Positive },
        { name: "Neutral", value: percentageData.Neutral },
        { name: "Negative", value: percentageData.Negative },
      ]);
      console.log("sentiment list is: ", sentimentList);
    }
  }, [sentimentList]);

  useEffect(() => {
    console.log("the data is: ", sentimentData.length);
  }, [sentimentData]);

  // useEffect(() => {
  //   if (sentimentList && sentimentList.length > 0) {
  //     console.log("SentimentList", sentimentList);
  //     setSentimentData(sentimentList);
  //   }
  // }, [sentimentList]);

  const handleBaseUrl = useCallback((value) => {
    console.log("base url is: ", value);
    setBaseUrl(value);
  }, []);

  const handleCount = useCallback((value) => {
    console.log("base url is: ", value);
    setCount(parseInt(value));
  }, []);

  const handleBaseURLSubmit = () => {
    console.log("clicked");
    // const reviews = await scrapeAmazonReviews(baseUrl);
    const formData = new FormData();
    formData.append("url", baseUrl);
    formData.append("count", count);
    console.log("data url is: ", baseUrl, count);
    submit(formData, { method: "post" });
  };

  function getStars(ratingString) {
    const rating = parseFloat(ratingString.split(" ")[0]); // Extract the numerical value from the string
    const fullStars = Math.floor(rating);
    const halfStars = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStars;

    return "★".repeat(fullStars) + "☆".repeat(emptyStars);
  }

  const handleReviewMetafield = () => {
    console.log("id is: ", productInput, productReviewList);
    const formData = new FormData();
    formData.append("reviewList", productReviewList);
    formData.append("Id", productInput);
    submit(formData, { method: "post" });
  };

  // ------------------------------
  // methods

  //

  const { allProductsData } = useLoaderData();
  const [productInput, setProductInput] = useState("");
  const [productInputList, setProductInputList] = useState([]);
  const productNextData = useActionData() ?? null;
  const submit = useSubmit();
  const [productList, setProductList] = useState([]);
  const [imageTemp, setImageTemp] = useState("");
  const [pageInfo, setPageInfo] = useState({
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const actionData = useActionData() ?? null;
  const [imageUrl, setImageUrl] = useState(
    "https://st2.depositphotos.com/1561359/12101/v/950/depositphotos_121012076-stock-illustration-blank-photo-icon.jpg",
  );
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState([]);
  const [imageSize, setImageSize] = useState({
    width: "15rem",
    height: "15rem",
  });
  const optionsList = [
    { value: { width: "17rem", height: "14rem" }, label: "landscape" },
    { value: { width: "14rem", height: "17rem" }, label: "portrait" },
    { value: { width: "15rem", height: "15rem" }, label: "square" },
  ];
  const navigate = useNavigate();
  const nav = useNavigation();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
  const productId = actionData?.product;

  // methods
  useEffect(() => {
    if (productId) {
      shopify.toast.show("Product created");
    }
  }, [productId, shopify]);

  useEffect(() => {
    if (actionData && actionData.imageBytes) {
      setLoading(false);
      const base64Image = btoa(
        String.fromCharCode.apply(
          null,
          new Uint8Array(actionData.imageBytes.data),
        ),
      );
      const url = `data:image/jpeg;base64,${base64Image}`;
      console.log("image url is: ", url);
      setImageUrl(url);
    }
  }, [actionData]);;

  useEffect(() => {
    console.log("selected is: ", String(selected[0]));
    optionsList.map((option) => {
      console.log("value is: ", option.label);
    });
    console.log("The list is: ", optionsList);
    const selectedOption = optionsList.find(
      (option) => option.label == selected[0],
    );
    console.log("Selected value is: ", selectedOption);
    if (selectedOption && selectedOption.value) {
      setImageSize(selectedOption.value);
    }
    console.log("image is: ", imageSize);
  }, [selected]);

  // function
  useEffect(() => {
    if (productNextData && productNextData.allProductsData) {
      console.log("next data is: ", productNextData);
      setLoading(false);
      setPageInfo(productNextData.allProductsData.data.products.pageInfo);
      setProductList(productNextData.allProductsData.data.products.edges);
    } else if (allProductsData?.data?.products) {
      console.log("page info is: ", allProductsData.data.products.pageInfo);
      setPageInfo(allProductsData.data.products.pageInfo);
      setProductList(allProductsData.data.products.edges);
    }
  }, [allProductsData]);

  useEffect(() => {
    if (productNextData?.allProductsData?.data?.products) {
      setLoading(false);
      setPageInfo(productNextData.allProductsData.data.products.pageInfo);
      setProductList(productNextData.allProductsData.data.products.edges);
    }
  }, [productNextData]);

  const handleGenerateImage = (productID, imageData) => {
    setImageModal(true);
    setImageTemp(imageData);
    setProductInput(productID);
  };

  const handleNextPage = () => {
    console.log("clicked");
    if (pageInfo.hasNextPage) {
      setLoading(true);
      const lastEdge = productList[productList.length - 1];
      const formData = new FormData();
      formData.append("cursor", lastEdge.cursor);
      formData.append("page", "nextPage");
      for (const pair of formData.entries()) {
        console.log(pair[0] + ", " + pair[1]);
      }
      submit(formData, { method: "post" });
    }
  };

  const handleEditModalClose = useCallback(() => {
    setEditModal(false);
  }, [editModal]);

  const handleModalClose = useCallback(() => {
    setModal(false);
  }, [modal]);

  const handlePreviousPage = () => {
    if (pageInfo.hasPreviousPage) {
      setLoading(true);
      const firstEdge = productList[0];
      const formData = new FormData();
      formData.append("cursor", firstEdge.cursor);
      formData.append("page", "prevPage");
      for (const pair of formData.entries()) {
        console.log(pair[0] + ", " + pair[1]);
      }
      submit(formData, { method: "post" });
    }
  };

  const handleImageModalClose = useCallback(() => {
    setImageModal(false);
  }, [imageModal]);

  useEffect(() => {
    console.log("product list is: ", productInputList);
  }, [productInputList]);

  // ---------------------------------------------------------------------------

  const productRows = productList.map(({ node }) => {
    const productID = node.id.match(/\d+$/)[0];
    const imageData = node.images.edges[0]?.node.url || "";
    return (
      <IndexTable.Row key={node.id} id={node.id}>
        <IndexTable.Cell key="image">
          <Image
            source={node.images.edges[0]?.node.url || ""}
            alt={node.title}
            width={50}
            height={50}
          />
        </IndexTable.Cell>
        <IndexTable.Cell key="title">
          <Text>{node.title}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell key="price">
          <Text>{node.priceRangeV2.minVariantPrice.amount}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell key="action">
          <Button
            variant="secondary"
            onClick={() => handleGenerateImage(productID, imageData)}
            target="_blank"
          >
            Analyse Reviews
          </Button>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page>
      <BlockStack>
        <IndexTable
          itemCount={productList.length}
          headings={[
            { title: "Image" },
            { title: "Title" },
            { title: "Price" },
            { title: "Action" },
          ]}
          selectable={false}
        >
          {productRows}
        </IndexTable>
      </BlockStack>
      <div
        style={{
          display: "flex",
          justifyContent: "right",
          backgroundColor: "white",
        }}
      >
        {!loading && (
          <Pagination
            hasPrevious={pageInfo.hasPreviousPage}
            onPrevious={handlePreviousPage}
            hasNext={pageInfo.hasNextPage}
            onNext={handleNextPage}
          />
        )}
        {loading && (
          <div style={{ marginRight: "1rem" }}>
            <Spinner size="small" />
          </div>
        )}
      </div>
      {modal && (
        <Box>
          <Modal
            size="large"
            open={modal}
            style={{ width: "2000px" }}
            onClose={handleModalClose}
            title="Add Reviews"
            primaryAction={[
              {
                content: "Close",
                onAction: handleModalClose,
              },
            ]}
          >
            <Modal.Section>
              <Page>
                <Layout>
                  <Layout.Section>
                    <Card>
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h6">
                          Amazon Reviews
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                  <Layout.Section variant="oneThird">
                    {sentimentList.length > 0 && (
                      <div>
                      <h3>Sentiment Data</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Profile</th>
                            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Label</th>
                            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Score</th>
                            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Body</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sentimentList.map((item, index) => (
                            <tr key={index}>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{item.profile}</td>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{item.label}</td>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{item.score}</td>
                              <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>{item.body}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                    {sentimentData.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <PieChart width={400} height={300}>
                          <Pie
                            data={sentimentData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            strokeWidth={2}
                            stroke="#2C3E50"
                          >
                            {sentimentData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </div>
                    )}
                  </Layout.Section>
                </Layout>
              </Page>
            </Modal.Section>
          </Modal>
        </Box>
      )}
      {imageModal && (
        <Box shadow="300" borderWidth="025">
          <Modal
            size="large"
            open={imageModal}
            onClose={handleImageModalClose}
            title="Add Reviews"
            primaryAction={[
              {
                content: "Close",
                onAction: handleImageModalClose,
              },
            ]}
          >
            <Modal.Section>
              <Layout>
                <Layout.Section variant="oneThird">
                  <BlockStack width="200" gap="300">
                    <Box shadow="300" padding={300}>
                      <BlockStack gap="300">
                        <Text variant="headingMd" as="h6">
                          Amazon Reviews
                        </Text>
                        <InlineStack width="200">
                          <Button variant="secondary" onClick="">
                            Add Reviews
                          </Button>
                        </InlineStack>
                      </BlockStack>
                      <br></br>
                      <Box shadow="300" borderWidth="025" padding={500}>
                        <TextField
                          label="Enter Amazon Product review Url page like https://www.amazon.in/Amazon-Brand-12-inch-Roulette-Movement/product-reviews/B076VF43GG/ref=cm_cr_getr_d_paging_btm_next_4?ie=UTF8&reviewerType=all_reviews&pageNumber=1 {No other urls are accepted}"
                          value={baseUrl}
                          onChange={(newValue) => handleBaseUrl(newValue)}
                          autoComplete="off"
                        />
                        <TextField
                          label="Review Count"
                          value={count}
                          type="number"
                          onChange={(newValue) => handleCount(newValue)}
                          autoComplete="off"
                        />
                        <br></br>
                        <Button
                          variant="secondary"
                          onClick={handleBaseURLSubmit}
                        >
                          Submit
                        </Button>
                      </Box>
                    </Box>
                    {productReviewList.length > 0 && (
                      <Box padding={500} shadow="300">
                        <Text>Review List</Text>
                        <ul>
                          {productReviewList.map((review, index) => (
                            <Box padding={500} shadow="300">
                              <Layout>
                                <Layout.Section>
                                  <li key={index}>
                                    <div>Profile: {review.profile}</div>
                                    <div>
                                      Rating: {review.rating}{" "}
                                      <span
                                        className="stars"
                                        style={{ color: "gold", width: "2rem" }}
                                      >
                                        {getStars(review.rating)}
                                      </span>
                                    </div>
                                    <div>Body: {review.body}</div>
                                    <div>Date: {review.date}</div>
                                    <div>
                                      Helpful Votes: {review.helpfulVotes}
                                    </div>
                                  </li>
                                </Layout.Section>
                                <Layout.Section variant="oneThird">
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      width: "9rem",
                                      backgroundColor: "white",
                                      color: "black",
                                      height: "2rem",
                                    }}
                                    onClick={handleReviewMetafield}
                                  >
                                    Publish Review
                                  </button>
                                </Layout.Section>
                              </Layout>
                            </Box>
                          ))}
                        </ul>
                      </Box>
                    )}
                    {sentimentData.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <PieChart width={400} height={300}>
                          <Pie
                            data={sentimentData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            strokeWidth={2}
                            stroke="#2C3E50"
                          >
                            {sentimentData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </div>
                    )}
                  </BlockStack>
                </Layout.Section>
              </Layout>
            </Modal.Section>
          </Modal>
        </Box>
      )}
    </Page>
  );
}
