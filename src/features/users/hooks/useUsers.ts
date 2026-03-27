import { useQuery } from "@tanstack/react-query";
import { usersService } from "../services/userService";

export const useUsers = () => {
    return useQuery({
        queryKey: ["users"],
        queryFn: () => usersService.getUser(),
    });
};