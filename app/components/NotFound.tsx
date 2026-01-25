import { ErrorCard } from "./ErrorCard"

export default function NotFound() {
  return (
    <ErrorCard
      title="404 Page Not Found"
      message="The page you're looking for has been deleted or never existed in the first place."
      additionalMessage="Error Code: 404_PAGE_NOT_FOUND"
    />
  )
}
