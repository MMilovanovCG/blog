module.exports = {
  siteMetadata: {
    title: 'The CarGurus Engineering Blog',
    author: 'CarGurus',
    description: `From the team building the most visited automotive marketplace in the U.S.
    We give people the power to reach their destination.`,
    siteUrl:
      process.env.NODE_ENV !== 'production'
        ? 'http://localhost:8000'
        : 'https://cargurus.dev',
    social: {
      twitter: 'CarGurus',
    },
  },
  plugins: [
    'gatsby-plugin-sitemap',
    'gatsby-plugin-netlify',
    'gatsby-plugin-less',
    'gatsby-plugin-react-svg',
    {
      resolve: 'gatsby-plugin-eslint',
      options: {
        test: /\.js$|\.jsx$/,
        exclude: /(node_modules|.cache|public)/,
        stages: ['develop', 'build-javascript'],
        options: {
          emitWarning: true,
          failOnError: true,
        },
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: `${__dirname}/content/blog`,
        name: 'blog',
      },
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: `${__dirname}/content/assets`,
        name: 'assets',
      },
    },
    'gatsby-transformer-json',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        path: `${__dirname}/authors/authors.json`,
        name: 'authors',
      },
    },
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [
          {
            resolve: 'gatsby-remark-katex',
            options: {
              // Add any KaTeX options from https://github.com/KaTeX/KaTeX/blob/master/docs/options.md here
              strict: 'ignore',
            },
          },
          {
            resolve: 'gatsby-remark-images',
            options: {
              maxWidth: 769,
              withWebp: true,
              showCaptions: true,
            },
          },
          {
            resolve: 'gatsby-remark-responsive-iframe',
            options: {
              wrapperStyle: 'margin-bottom: 1.0725rem',
            },
          },
          'gatsby-remark-prismjs',
          'gatsby-remark-copy-linked-files',
          'gatsby-remark-smartypants',
        ],
      },
    },
    'gatsby-transformer-sharp',
    'gatsby-plugin-sharp',
    {
      resolve: 'gatsby-plugin-google-analytics',
      options: {
        trackingId: 'UA-4745999-21',
      },
    },
    {
      resolve: 'gatsby-plugin-feed',
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
                site_url: siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, allMarkdownRemark } }) => allMarkdownRemark.edges.map(edge =>
                Object.assign({}, edge.node.frontmatter, {
                  description: edge.node.excerpt,
                  date: edge.node.frontmatter.date,
                  url:
                    site.siteMetadata.siteUrl +
                    (edge.node.frontmatter.permalink || edge.node.fields.slug),
                  guid:
                    site.siteMetadata.siteUrl +
                    (edge.node.frontmatter.permalink || edge.node.fields.slug),
                  custom_elements: [{ 'content:encoded': edge.node.html }],
                })),
            query: `
              {
                allMarkdownRemark(
                  sort: { order: DESC, fields: [frontmatter___date] },
                ) {
                  edges {
                    node {
                      excerpt(pruneLength: 180)
                      html
                      fields { slug }
                      frontmatter {
                        title
                        date
                        permalink
                      }
                    }
                  }
                }
              }
            `,
            output: '/rss.xml',
          },
        ],
      },
    },
    {
      resolve: 'gatsby-plugin-manifest',
      options: {
        name: 'Revved',
        short_name: 'Revved',
        start_url: '/',
        background_color: '#ffffff',
        theme_color: '#00a0dd',
        display: 'minimal-ui',
        icon: 'content/assets/favicon.ico',
      },
    },
    {
      resolve: 'gatsby-plugin-offline',
      options: {
        runtimeCaching: [
          {
            // Use cacheFirst since these don't need to be revalidated (same RegExp
            // and same reason as above)
            urlPattern: /(\.js$|\.css$|static\/)/,
            handler: 'cacheFirst',
          },
          {
            // Add runtime caching of various other page resources
            urlPattern: /^https?:.*\.(png|jpg|jpeg|webp|svg|gif|tiff|js|woff|woff2|json|css)$/,
            handler: 'staleWhileRevalidate',
          },
          {
            // Google Fonts CSS (doesn't end in .css so we need to specify it)
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/css/,
            handler: 'staleWhileRevalidate',
          },
          {
            // don't use cache for trailing slash urls, or urls that end in .dev
            urlPattern: /(\/|\.dev)$/,
            handler: 'networkFirst',
          },
        ],
      },
    },
    'gatsby-plugin-react-helmet',
    {
      resolve: 'gatsby-plugin-typography',
      options: {
        pathToConfigModule: 'src/utils/typography',
      },
    },
  ],
};
