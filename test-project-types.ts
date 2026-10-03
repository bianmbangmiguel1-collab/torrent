// test-project-types.ts

interface TestApiResponse {
  foo?: string
  bar?: number
}

async function testProjectTypes() {
  const response = await fetch("/api/test")
  const data = (await response.json()) as TestApiResponse

  data.foo
  data.bar
}