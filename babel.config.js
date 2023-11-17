module.exports = {
  plugins: [
    [
      'module-resolver',
      {
        root: ['./dist/'],
        alias: {
          '@': './dist',
          '@data-masking-job': './dist/modules/data-masking/job',
          '@retrieve-metadata-job': './dist/modules/retrieve-metadata/job',
        },
      },
    ],
  ],
};
