// Function to create success response
function createSuccessResponse(data) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Conversion completed successfully',
      ...data
    })
  };
}

// Function to create error response
function createErrorResponse(error) {
  return {
    statusCode: 500,
    body: JSON.stringify({
      message: 'Error processing request',
      error: error.message
    })
  };
}

module.exports = {
  createSuccessResponse,
  createErrorResponse
}; 