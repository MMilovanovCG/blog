const path = require('path');
const { createFilePath } = require('gatsby-source-filesystem');
const visit = require('unist-util-visit');

exports.createPages = ({ graphql, actions }) => {
  const { createPage, createRedirect } = actions;

  const blogPost = path.resolve('./src/templates/blog-post.js');
  const tagTemplate = path.resolve('./src/templates/tag-template.js');
  const allTagTemplate = path.resolve('./src/templates/all-tags-template.js');
  const FeedTemplate = path.resolve('./src/templates/feed-template.js');
  const postsPerPage = 10;

  return graphql(
    `
      {
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
              }
              htmlAst
              frontmatter {
                title
                tags
                permalink
                redirects
              }
            }
          }
        }
      }
    `,
  ).then(result => {
    if (result.errors) {
      throw result.errors;
    }

    // Create blog posts pages.
    const posts = result.data.allMarkdownRemark.edges;
    let tags = [];
    const postFeaturedImageThumbnail = {};
    posts.forEach((post, index) => {
      const previous =
        index === posts.length - 1 ? null : posts[index + 1].node;
      const next = index === 0 ? null : posts[index - 1].node;
      tags = tags.concat(post.node.frontmatter.tags);
      const url = post.node.frontmatter.permalink || post.node.fields.slug;
      let featuredImages = [];
      visit(post.node.htmlAst, [{ tagName: 'img', type: 'element' }], node => {
        if (node && node.properties && node.properties.src) {
          featuredImages = featuredImages.concat(node.properties.src);
        }
      });
      if (featuredImages.length > 0) {
        // eslint-disable-next-line prefer-destructuring
        postFeaturedImageThumbnail[post.node.fields.slug] = featuredImages[0];
      }
      createPage({
        path: url,
        component: blogPost,
        context: {
          slug: post.node.fields.slug,
          previous,
          next,
          featuredImages,
        },
      });
      if (post.node.frontmatter.redirects) {
        post.node.frontmatter.redirects.forEach(redirect => {
          createRedirect({
            fromPath: redirect,
            toPath: url,
            isPermanent: true,
          });
        });
      }
    });
    // only use unique values
    tags = [...new Set(tags)];
    tags.forEach(tag => {
      createPage({
        path: `/tags/${tag}/`,
        component: tagTemplate,
        context: {
          tag,
          postFeaturedImageThumbnail,
        },
      });
    });
    createPage({
      path: '/tags/',
      component: allTagTemplate,
      context: {
        tags,
      },
    });

    // Blog Feed Page
    const numPages = Math.ceil(posts.length / postsPerPage);
    Array.from({ length: numPages }).forEach((_item, index) => {
      createPage({
        path: index === 0 ? '/' : `/page/${index + 1}`,
        component: FeedTemplate,
        context: {
          totalCount: posts.length,
          limit: postsPerPage,
          skip: index * postsPerPage,
          current: index + 1,
          postFeaturedImageThumbnail,
        },
      });
    });
    return null;
  });
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === 'MarkdownRemark') {
    if (node.frontmatter && node.frontmatter.tags) {
      // normalize tags to lower kebab case
      // eslint-disable-next-line no-param-reassign
      node.frontmatter.tags = node.frontmatter.tags.map(a =>
        a.replace(/\s/g, '-').toLowerCase(),
      );
      const value = createFilePath({ node, getNode });
      createNodeField({
        name: 'slug',
        node,
        value,
      });
    }
  }
};
// This is to prevent an error being thrown when we have no blog posts with 'redirects' field
exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type MarkdownRemarkFrontmatter implements Node {
      redirects: String,
      permalink: String,
      thumbnail: File,
      description: String,
    }

    type AuthorsJson implements Node {
      blog: String,
      github: String,
      twitter: String,
    }
  `;
  createTypes(typeDefs);
};
