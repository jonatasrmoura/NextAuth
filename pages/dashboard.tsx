import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { withSSRAuth } from "../utils/withSSRAuth";
import { setupApiClient } from "../services/api";

export default function Dashboard() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <h1>Dashboard</h1>
      <h2>E-mail: {user?.email}</h2>
      <h2>Permissões: {user?.permissions.map(per => (
        <span key={per}>{per}</span>
      ))}</h2>
      <h2>Cargo: {user?.roles.map(role => (
        <span key={role}>{role}</span>
      ))}</h2>
    </>
  );
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupApiClient(ctx);
  const response = await apiClient.get('/me');
 
  console.log(response);

  return {
    props: {}
  }
});
